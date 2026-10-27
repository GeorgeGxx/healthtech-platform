import { Injectable } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes, createHmac } from 'node:crypto';

@Injectable()
export class PhiCryptoService {
  private readonly algorithm = 'aes-256-gcm';
  // Llave simétrica de 256 bits derivada o por defecto para cifrado PHI
  private readonly secretKey: Buffer;
  private readonly hmacSecret: string;

  constructor() {
    const rawKey = process.env.PHI_ENCRYPTION_KEY || 'centromediconacional-healthtech-phi-secret-key-32b';
    this.secretKey = Buffer.from(rawKey.padEnd(32, '0').slice(0, 32), 'utf-8');
    this.hmacSecret = process.env.PRESCRIPTION_HMAC_SECRET || 'healthtech-prescription-signature-key-2026';
  }

  /**
   * Cifra datos médicos protegidos (PHI) mediante AES-256-GCM
   * Retorna cadena en formato: iv:authTag:encryptedData (hex)
   */
  encryptPhi(plainText: string): string {
    if (!plainText) return '';
    const iv = randomBytes(16);
    const cipher = createCipheriv(this.algorithm, this.secretKey, iv);
    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  /**
   * Descifra datos PHI cifrados con AES-256-GCM
   */
  decryptPhi(cipherText: string): string {
    if (!cipherText || !cipherText.includes(':')) return cipherText;
    try {
      const [ivHex, authTagHex, encryptedHex] = cipherText.split(':');
      if (!ivHex || !authTagHex || !encryptedHex) return cipherText;

      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      const decipher = createDecipheriv(this.algorithm, this.secretKey, iv);
      decipher.setAuthTag(authTag);
      let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch {
      // Si no fue cifrado o falla la autenticación, retorna texto original
      return cipherText;
    }
  }

  /**
   * Enmascara identificadores y nombres para bitácoras forenses HIPAA
   * Ej: "28456123" -> "28****23", "Juan Pérez" -> "J*** P****"
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
   * Genera una representación JSON canónica con llaves ordenadas determinísticamente
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
   * Genera firma criptográfica HMAC-SHA256 para validación de Recetas Médicas Digitales
   */
  generatePrescriptionSignature(payload: string): string {
    return createHmac('sha256', this.hmacSecret).update(payload).digest('hex');
  }

  verifyPrescriptionSignature(payload: string, signature: string): boolean {
    const expected = this.generatePrescriptionSignature(payload);
    return expected === signature;
  }
}
