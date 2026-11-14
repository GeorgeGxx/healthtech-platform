import { describe, it, expect, afterEach } from 'vitest';
import { InternalServerErrorException } from '@nestjs/common';
import { PhiCryptoService } from './phi-crypto.service.js';

describe('PhiCryptoService', () => {
  const origEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...origEnv };
  });

  it('encrypts with a 96-bit (12-byte) nonce and key version prefix gcm:v1:', () => {
    const cryptoSvc = new PhiCryptoService();
    const plaintext = 'Stage 2 arterial hypertension - Losartan 50mg plan';

    const encrypted = cryptoSvc.encryptPhi(plaintext);
    expect(encrypted.startsWith('gcm:v1:')).toBe(true);
    const parts = encrypted.slice('gcm:'.length).split(':');
    expect(parts.length).toBe(4);
    expect(parts[1].length).toBe(24); // 12 bytes = 24 hex chars
    expect(encrypted).not.toContain('hypertension');

    const decrypted = cryptoSvc.decryptPhi(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it('detects tampering of ciphertext or GCM AuthTag', () => {
    const cryptoSvc = new PhiCryptoService();
    const encrypted = cryptoSvc.encryptPhi('Confidential diagnosis');
    const tampered = encrypted.slice(0, -2) + (encrypted.endsWith('aa') ? 'bb' : 'aa');

    expect(() => cryptoSvc.decryptPhi(tampered)).toThrow(InternalServerErrorException);
  });

  it('supports key rotation while keeping historical records readable', () => {
    process.env.NODE_ENV = 'production';
    process.env.PHI_ENCRYPTION_KEYS =
      'v1=0123456789abcdef0123456789abcdef,v2=fedcba9876543210fedcba9876543210';
    process.env.PHI_ENCRYPTION_KEY_ID = 'v1';
    process.env.PRESCRIPTION_HMAC_SECRET = 'hmac-secret-at-least-32-characters-long-1234';

    const v1Svc = new PhiCryptoService();
    const oldCiphertext = v1Svc.encryptPhi('Historical diagnosis');
    expect(oldCiphertext.startsWith('gcm:v1:')).toBe(true);

    process.env.PHI_ENCRYPTION_KEY_ID = 'v2';
    const v2Svc = new PhiCryptoService();
    expect(v2Svc.decryptPhi(oldCiphertext)).toBe('Historical diagnosis');

    const rotated = v2Svc.rotatePhi(oldCiphertext);
    expect(rotated.startsWith('gcm:v2:')).toBe(true);
    expect(v2Svc.decryptPhi(rotated)).toBe('Historical diagnosis');
  });

  it('fails closed in production on unencrypted plaintext and missing keys', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.PHI_ENCRYPTION_KEY;
    delete process.env.PHI_ENCRYPTION_KEYS;
    delete process.env.PRESCRIPTION_HMAC_SECRET;

    expect(() => new PhiCryptoService()).toThrow(/CRITICAL HIPAA/);

    process.env.PHI_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef';
    process.env.PRESCRIPTION_HMAC_SECRET = 'hmac-secret-at-least-32-characters-long-1234';
    const prodSvc = new PhiCryptoService();
    expect(() => prodSvc.decryptPhi('arbitrary-plaintext')).toThrow(InternalServerErrorException);
  });

  it('signs and verifies digital medical prescriptions with constant-time HMAC-SHA256', () => {
    const cryptoSvc = new PhiCryptoService();
    const payload = cryptoSvc.canonicalJson({
      idPaciente: 1,
      idMedico: 2,
      codigoVerificacion: 'RX-2026-001',
      fechaEmision: '2026-11-13',
    });
    const sig = cryptoSvc.generatePrescriptionSignature(payload);

    expect(cryptoSvc.verifyPrescriptionSignature(payload, sig)).toBe(true);
    expect(cryptoSvc.verifyPrescriptionSignature(payload + 'tamper', sig)).toBe(false);
    expect(cryptoSvc.verifyPrescriptionSignature(payload, 'not-hex')).toBe(false);
    expect(cryptoSvc.verifyPrescriptionSignature(payload, sig.slice(0, 10))).toBe(false);
  });
});
