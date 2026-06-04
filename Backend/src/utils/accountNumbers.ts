/**
 * Genera un número de cuenta aleatorio con formato "ACC-XXXXXX".
 * El llamador debe verificar unicidad en la BD y reintentar si hay colisión.
 */
export function generateAccountNumber(): string {
  const digits = Math.floor(Math.random() * 1_000_000).toString().padStart(6, '0');
  return `ACC-${digits}`;
}
