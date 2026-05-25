import { describe, it, expect } from 'vitest';
import {
  accountNumberSchema,
  moneyAmountSchema,
  emailSchema,
  passwordSchema,
} from '../schemas/common';

// BU-34 — RNF-10: validación de número de cuenta (16 dígitos)
describe('accountNumberSchema (RNF-10)', () => {
  it('acepta exactamente 16 dígitos', () => {
    expect(accountNumberSchema.safeParse('1234567890123456').success).toBe(true);
  });
  it('rechaza menos de 16 dígitos', () => {
    expect(accountNumberSchema.safeParse('123456789012345').success).toBe(false);
  });
  it('rechaza más de 16 dígitos', () => {
    expect(accountNumberSchema.safeParse('12345678901234567').success).toBe(false);
  });
  it('rechaza caracteres no numéricos', () => {
    expect(accountNumberSchema.safeParse('123456789012345A').success).toBe(false);
  });
  it('rechaza cadena vacía', () => {
    expect(accountNumberSchema.safeParse('').success).toBe(false);
  });
});

// BU-32 — RNF-08: validación de montos monetarios (2 decimales)
describe('moneyAmountSchema (RNF-08)', () => {
  it('acepta monto con 2 decimales', () => {
    expect(moneyAmountSchema.safeParse(500.00).success).toBe(true);
  });
  it('acepta monto entero (equivale a .00)', () => {
    expect(moneyAmountSchema.safeParse(1000).success).toBe(true);
  });
  it('acepta 1 decimal', () => {
    expect(moneyAmountSchema.safeParse(500.5).success).toBe(true);
  });
  it('rechaza más de 2 decimales', () => {
    expect(moneyAmountSchema.safeParse(500.123).success).toBe(false);
  });
  it('rechaza monto 0', () => {
    expect(moneyAmountSchema.safeParse(0).success).toBe(false);
  });
  it('rechaza monto negativo', () => {
    expect(moneyAmountSchema.safeParse(-100).success).toBe(false);
  });
});

// BU-33 — RNF-09: validación de formato de correo electrónico
describe('emailSchema (RNF-09)', () => {
  it('acepta email válido', () => {
    expect(emailSchema.safeParse('usuario@banco.mx').success).toBe(true);
  });
  it('rechaza email sin @', () => {
    expect(emailSchema.safeParse('usuariobanco.mx').success).toBe(false);
  });
  it('rechaza email sin dominio', () => {
    expect(emailSchema.safeParse('usuario@').success).toBe(false);
  });
  it('rechaza cadena vacía', () => {
    expect(emailSchema.safeParse('').success).toBe(false);
  });
});

// BU-23 — RNF-03: política de complejidad de contraseñas
describe('passwordSchema (RNF-03)', () => {
  it('acepta contraseña válida (5-8 chars, mayúscula, número, especial)', () => {
    expect(passwordSchema.safeParse('Admin1!').success).toBe(true);
  });
  it('rechaza contraseña menor a 5 caracteres', () => {
    expect(passwordSchema.safeParse('Ab1!').success).toBe(false);
  });
  it('rechaza contraseña mayor a 8 caracteres', () => {
    expect(passwordSchema.safeParse('Admin123!!').success).toBe(false);
  });
  it('rechaza contraseña sin mayúscula', () => {
    expect(passwordSchema.safeParse('admin1!').success).toBe(false);
  });
  it('rechaza contraseña sin número', () => {
    expect(passwordSchema.safeParse('Admin!!').success).toBe(false);
  });
  it('rechaza contraseña sin carácter especial', () => {
    expect(passwordSchema.safeParse('Admin12').success).toBe(false);
  });
});
