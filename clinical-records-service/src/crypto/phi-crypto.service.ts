import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes, createHmac, hkdfSync } from 'node:crypto';

@Injectable()
export class PhiCryptoService {
  private readonly logger = new Logger(PhiCryptoService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly cipherPrefix = 'gcm:';
  private readonly secretKey: Buffer;
  private readonly hmacSecret: string;

  constructor() {
    const isProd = process.env.NODE_ENV === 'production';
    const rawKey = process.env.PHI_ENCRYPTION_KEY;
    const rawHmac = process.env.PRESCRIPTION_HMAC_SECRET;

    if (isProd && (!rawKey || !rawHmac)) {
      throw new Error(
        'CRITICAL HIPAA: PHI_ENCRYPTION_KEY and PRESCRIPTION_HMAC_SECRET are required in production.',
      );
    }

    if (!rawKey || !rawHmac) {
      this.logger.warn(
        '⚠️ Using development cryptographic keys. Define PHI_ENCRYPTION_KEY and PRESCRIPTION_HMAC_SECRET in .env.',
      );
    }

    const effectiveKey = rawKey || 'dev-only-healthtech-phi-master-key-2026';
    this.secretKey = Buffer.from(
      hkdfSync('sha256', effectiveKey, 'healthtech-phi-salt-2026', 'aes-256-gcm-phi', 32),
    );
    this.hmacSecret = rawHmac || 'dev-only-healthtech-prescription-hmac-2026';
  }

  /**
   * Encrypts Protected Health Information (PHI) using AES-256-GCM.
   * Returns string in format: gcm:iv:authTag:encryptedData (hex)
   */
  encryptPhi(plainText: string): string {
    if (!plainText) return '';
    if (plainText.startsWith(this.cipherPrefix)) return plainText;
    const iv = randomBytes(16);
    const cipher = createCipheriv(this.algorithm, this.secretKey, iv);
    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${this.cipherPrefix}${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  /**
   * Decrypts PHI data encrypted with AES-256-GCM.
   * Explicitly rejects if an encrypted record fails integrity verification (AuthTag).
   */
  decryptPhi(cipherText: string): string {
    if (!cipherText) return cipherText;
    if (!cipherText.startsWith(this.cipherPrefix)) {
      // Controlled compatibility for legacy historical records without gcm: prefix
      return cipherText;
    }

    const payload = cipherText.slice(this.cipherPrefix.length);
    const [ivHex, authTagHex, encryptedHex] = payload.split(':');
    if (!ivHex || !authTagHex || !encryptedHex) {
      throw new InternalServerErrorException('Invalid encrypted PHI data format');
    }

    try {
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      if (authTag.length !== 16) {
        throw new Error('Invalid GCM authentication tag length');
      }
      const decipher = createDecipheriv(this.algorithm, this.secretKey, iv, {
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
   * Masks identifiers and names for HIPAA forensic audit logs
   * Ex: "28456123" -> "28****23", "Juan Pérez" -> "J*** P****"
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
   * Generates a canonical JSON representation with deterministically sorted keys
   */
  canonicalJson(obj: any): string {
    if (obj === null || typeof obj !== 'object') {
      return JSON.stringify(obj);
    }
    if (Array.isArray(obj)) {
      return '[' + obj.map((item) => this.canonicalJson(item)).join(',') + ']';
    }
    const keys = Object.keys(obj).sort();
    return '{' + keys.map((k) => JSON.stringify(k) + ':' + this.canonicalJson(obj[k])).join(',') + '}';
  }

  /**
   * Generates an HMAC-SHA256 cryptographic signature for Digital Medical Prescription validation
   */
  generatePrescriptionSignature(payload: string): string {
    return createHmac('sha256', this.hmacSecret).update(payload).digest('hex');
  }

  verifyPrescriptionSignature(payload: string, signature: string): boolean {
    const expected = this.generatePrescriptionSignature(payload);
    return expected === signature;
  }
}
