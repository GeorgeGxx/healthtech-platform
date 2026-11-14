import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  hkdfSync,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

const DEV_PHI_KEY = 'dev-only-healthtech-phi-master-key-2026';
const DEV_HMAC_SECRET = 'dev-only-healthtech-prescription-hmac-2026';

@Injectable()
export class PhiCryptoService {
  private readonly logger = new Logger(PhiCryptoService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly cipherPrefix = 'gcm:';
  private readonly activeKeyId: string;
  private readonly keysById = new Map<string, Buffer>();
  private readonly hmacSecret: string;
  private readonly isStrictEnv: boolean;

  constructor() {
    const nodeEnv = (process.env.NODE_ENV ?? '').toLowerCase();
    this.isStrictEnv = nodeEnv === 'production' || nodeEnv === 'staging';

    const rawKey = process.env.PHI_ENCRYPTION_KEY;
    const rawKeysMap = process.env.PHI_ENCRYPTION_KEYS;
    const rawHmac = process.env.PRESCRIPTION_HMAC_SECRET;
    this.activeKeyId = (process.env.PHI_ENCRYPTION_KEY_ID || 'v1').trim();

    if (this.isStrictEnv) {
      if ((!rawKey && !rawKeysMap) || !rawHmac) {
        throw new Error(
          'CRITICAL HIPAA: PHI_ENCRYPTION_KEY (or PHI_ENCRYPTION_KEYS) and PRESCRIPTION_HMAC_SECRET are required in staging/production.',
        );
      }
      if (rawKey === DEV_PHI_KEY || rawHmac === DEV_HMAC_SECRET) {
        throw new Error('CRITICAL HIPAA: Development cryptographic defaults are forbidden in staging/production.');
      }
      if (rawKey && rawKey.length < 32) {
        throw new Error('CRITICAL HIPAA: PHI_ENCRYPTION_KEY must be at least 32 characters in staging/production.');
      }
      if (rawHmac.length < 32) {
        throw new Error('CRITICAL HIPAA: PRESCRIPTION_HMAC_SECRET must be at least 32 characters in staging/production.');
      }
    } else if (!rawKey && !rawKeysMap) {
      this.logger.warn(
        'Using development cryptographic keys. Define PHI_ENCRYPTION_KEY and PRESCRIPTION_HMAC_SECRET in .env.',
      );
    }

    if (rawKeysMap) {
      this.loadKeyRing(rawKeysMap);
    }
    if (rawKey || this.keysById.size === 0) {
      const baseKey = rawKey || DEV_PHI_KEY;
      this.keysById.set(this.activeKeyId, this.deriveAesKey(baseKey, this.activeKeyId));
      if (!this.keysById.has('v1')) {
        this.keysById.set('v1', this.deriveAesKey(baseKey, 'v1'));
      }
    }

    if (!this.keysById.has(this.activeKeyId)) {
      throw new Error(`PHI_ENCRYPTION_KEY_ID "${this.activeKeyId}" not found in configured key ring.`);
    }

    this.hmacSecret = rawHmac || DEV_HMAC_SECRET;
  }

  private loadKeyRing(rawKeysMap: string): void {
    const trimmed = rawKeysMap.trim();
    if (trimmed.startsWith('{')) {
      const parsed = JSON.parse(trimmed) as Record<string, string>;
      for (const [kid, secret] of Object.entries(parsed)) {
        if (this.isStrictEnv && (!secret || secret.length < 32 || secret === DEV_PHI_KEY)) {
          throw new Error(`Invalid encryption key material for key version "${kid}"`);
        }
        this.keysById.set(kid, this.deriveAesKey(secret, kid));
      }
      return;
    }

    for (const pair of trimmed.split(',')) {
      const idx = pair.indexOf('=');
      if (idx > 0) {
        const kid = pair.slice(0, idx).trim();
        const secret = pair.slice(idx + 1).trim();
        if (this.isStrictEnv && (!secret || secret.length < 32 || secret === DEV_PHI_KEY)) {
          throw new Error(`Invalid encryption key material for key version "${kid}"`);
        }
        this.keysById.set(kid, this.deriveAesKey(secret, kid));
      }
    }
  }

  private deriveAesKey(masterSecret: string, keyId: string): Buffer {
    return Buffer.from(
      hkdfSync('sha256', masterSecret, `healthtech-phi-salt-${keyId}`, 'aes-256-gcm-phi', 32),
    );
  }

  /**
   * Encrypts Protected Health Information (PHI) using AES-256-GCM with a 96-bit (12-byte) nonce.
   * Returns string in format: gcm:<kid>:<ivHex>:<authTagHex>:<encryptedHex>
   */
  encryptPhi(plainText: string): string {
    if (!plainText) return '';
    if (plainText.startsWith(this.cipherPrefix)) return plainText;
    const key = this.keysById.get(this.activeKeyId)!;
    const iv = randomBytes(12); // NIST SP 800-38D recommended 96-bit nonce for GCM
    const cipher = createCipheriv(this.algorithm, key, iv, { authTagLength: 16 });
    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${this.cipherPrefix}${this.activeKeyId}:${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  /**
   * Decrypts PHI data encrypted with AES-256-GCM.
   * Supports key rotation (<kid>) and legacy 3-part gcm:<iv>:<tag>:<ct> format.
   * Fails closed in staging/production if ciphertext is missing the gcm: prefix unless
   * ALLOW_LEGACY_PLAINTEXT_PHI=true is explicitly set for controlled migration.
   */
  decryptPhi(cipherText: string): string {
    if (!cipherText) return cipherText;
    if (!cipherText.startsWith(this.cipherPrefix)) {
      if (this.isStrictEnv && process.env.ALLOW_LEGACY_PLAINTEXT_PHI !== 'true') {
        throw new InternalServerErrorException(
          'Unencrypted PHI record rejected in strict mode (migration required)',
        );
      }
      return cipherText;
    }

    const parts = cipherText.slice(this.cipherPrefix.length).split(':');
    let keyId = this.activeKeyId;
    let ivHex: string;
    let authTagHex: string;
    let encryptedHex: string;

    if (parts.length === 4) {
      [keyId, ivHex, authTagHex, encryptedHex] = parts;
    } else if (parts.length === 3) {
      [ivHex, authTagHex, encryptedHex] = parts;
      keyId = this.keysById.has('v1') ? 'v1' : this.activeKeyId;
    } else {
      throw new InternalServerErrorException('Invalid encrypted PHI data format');
    }

    if (!ivHex || !authTagHex || !encryptedHex) {
      throw new InternalServerErrorException('Invalid encrypted PHI data format');
    }

    const key = this.keysById.get(keyId);
    if (!key) {
      throw new InternalServerErrorException(`Unknown PHI encryption key version: ${keyId}`);
    }

    try {
      const iv = Buffer.from(ivHex, 'hex');
      if (iv.length !== 12 && iv.length !== 16) {
        throw new Error('Invalid GCM nonce length');
      }
      const authTag = Buffer.from(authTagHex, 'hex');
      if (authTag.length !== 16) {
        throw new Error('Invalid GCM authentication tag length');
      }
      const decipher = createDecipheriv(this.algorithm, key, iv, {
        authTagLength: 16,
      });
      decipher.setAuthTag(authTag);
      let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch {
      throw new InternalServerErrorException(
        'Cryptographic integrity failure (AuthTag) while decrypting PHI record',
      );
    }
  }

  /**
   * Re-encrypts a ciphertext record using the current active key version (for controlled key rotation).
   */
  rotatePhi(cipherText: string): string {
    if (!cipherText) return cipherText;
    const plain = this.decryptPhi(cipherText);
    return this.encryptPhi(plain);
  }

  /**
   * Masks identifiers and names for HIPAA forensic audit logs.
   */
  maskIdentifier(id: string): string {
    if (!id || id.length <= 4) return '****';
    const start = id.slice(0, 2);
    const end = id.slice(-2);
    return `${start}${'*'.repeat(Math.max(2, id.length - 4))}${end}`;
  }

  maskName(name: string): string {
    if (!name) return '***';
    return name
      .split(' ')
      .map((part) => (part.length > 1 ? `${part[0]}${'*'.repeat(part.length - 1)}` : '*'))
      .join(' ');
  }

  /**
   * Generates a canonical JSON representation with deterministically sorted keys.
   */
  canonicalJson(obj: unknown): string {
    if (obj === null || typeof obj !== 'object') {
      return JSON.stringify(obj);
    }
    if (Array.isArray(obj)) {
      return '[' + obj.map((item) => this.canonicalJson(item)).join(',') + ']';
    }
    const record = obj as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    return '{' + keys.map((k) => JSON.stringify(k) + ':' + this.canonicalJson(record[k])).join(',') + '}';
  }

  /**
   * Generates an HMAC-SHA256 cryptographic signature for Digital Medical Prescription validation.
   */
  generatePrescriptionSignature(payload: string): string {
    return createHmac('sha256', this.hmacSecret).update(payload).digest('hex');
  }

  /**
   * Verifies an HMAC-SHA256 signature using constant-time comparison.
   */
  verifyPrescriptionSignature(payload: string, signature: string): boolean {
    if (!signature || !/^[0-9a-fA-F]+$/.test(signature)) {
      return false;
    }
    const expected = this.generatePrescriptionSignature(payload);
    const expectedBuf = Buffer.from(expected, 'hex');
    const providedBuf = Buffer.from(signature, 'hex');
    if (expectedBuf.length !== providedBuf.length) {
      return false;
    }
    return timingSafeEqual(expectedBuf, providedBuf);
  }
}
