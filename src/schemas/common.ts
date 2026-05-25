import { z } from 'zod';

// RNF-10: número de cuenta de exactamente 16 dígitos numéricos
export const accountNumberSchema = z
  .string()
  .regex(/^\d{16}$/, 'El número de cuenta debe tener exactamente 16 dígitos numéricos');

// RNF-08: monto monetario — positivo, máximo 2 decimales
export const moneyAmountSchema = z
  .number({ invalid_type_error: 'El monto debe ser un número' })
  .positive('El monto debe ser mayor a $0.00')
  .refine(
    (val) => Math.round(val * 100) / 100 === val,
    'El monto no puede tener más de 2 decimales',
  );

// RNF-09: correo electrónico válido
export const emailSchema = z.string().email('Formato de correo electrónico inválido').max(254);

// RNF-03: 5-8 chars, ≥1 mayúscula, ≥1 número, ≥1 especial
export const passwordSchema = z
  .string()
  .min(5, 'La contraseña debe tener entre 5 y 8 caracteres')
  .max(8, 'La contraseña debe tener entre 5 y 8 caracteres')
  .regex(/[A-Z]/, 'La contraseña debe contener al menos una letra mayúscula')
  .regex(/[0-9]/, 'La contraseña debe contener al menos un número')
  .regex(/[^A-Za-z0-9]/, 'La contraseña debe contener al menos un carácter especial');
