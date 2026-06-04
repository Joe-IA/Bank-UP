/**
 * Error de negocio con código HTTP asociado.
 * El manejador centralizado (errorHandler) lo distingue de errores inesperados
 * y devuelve su mensaje directamente al cliente con el statusCode indicado.
 */
export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
  }
}
