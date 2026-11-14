import { describe, it, expect } from 'vitest';
import { InternalServerErrorException } from '@nestjs/common';
import { PhiCryptoService } from './phi-crypto.service.js';

describe('PhiCryptoService', () => {
  it('encrypts and decrypts clinical text using AES-256-GCM with gcm: prefix', () => {
    const cryptoSvc = new PhiCryptoService();
    const plaintext = 'Stage 2 arterial hypertension - Losartan 50mg plan';

    const encrypted = cryptoSvc.encryptPhi(plaintext);
    expect(encrypted.startsWith('gcm:')).toBe(true);
    expect(encrypted).not.toContain('hypertension');

    const decrypted = cryptoSvc.decryptPhi(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it('detects tampering of ciphertext or GCM AuthTag', () => {
    const cryptoSvc = new PhiCryptoService();
    const encrypted = cryptoSvc.encryptPhi('Confidential diagnosis');
    const tampered = encrypted.slice(0, -2) + 'aa';

    expect(() => cryptoSvc.decryptPhi(tampered)).toThrow(InternalServerErrorException);
  });

  it('signs and verifies digital medical prescriptions with HMAC-SHA256', () => {
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
  });
});
