import { describe, it, expect } from 'vitest';
import { InternalServerErrorException } from '@nestjs/common';
import { PhiCryptoService } from './phi-crypto.service.js';

describe('PhiCryptoService', () => {
  it('cifra y descifra texto clínico usando AES-256-GCM con prefijo gcm:', () => {
    const cryptoSvc = new PhiCryptoService();
    const plaintext = 'Hipertensión arterial estadio 2 - Plan Losartán 50mg';

    const encrypted = cryptoSvc.encryptPhi(plaintext);
    expect(encrypted.startsWith('gcm:')).toBe(true);
    expect(encrypted).not.toContain('Hipertensión');

    const decrypted = cryptoSvc.decryptPhi(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it('detecta manipulación del ciphertext o AuthTag GCM', () => {
    const cryptoSvc = new PhiCryptoService();
    const encrypted = cryptoSvc.encryptPhi('Diagnóstico confidencial');
    const tampered = encrypted.slice(0, -2) + 'aa';

    expect(() => cryptoSvc.decryptPhi(tampered)).toThrow(InternalServerErrorException);
  });

  it('firma y verifica recetas médicas digitales con HMAC-SHA256', () => {
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
