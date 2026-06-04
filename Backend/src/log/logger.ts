/** Devuelve la fecha y hora actual en formato "YYYY-MM-DD HH:MM:SS". */
const getTime = () => {
    return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

/**
 * Logger minimalista que prefija cada mensaje con timestamp y nivel.
 * Formato: [2024-01-15 10:30:00] [INFO] mensaje
 */
export const logger = {
    info: (message: string) => {
        console.log(`[${getTime()}] [INFO] ${message}`);
    },

    warn: (message: string) => {
        console.log(`[${getTime()}] [WARN] ${message}`);
    },
    error: (message: string) => {
        console.log(`[${getTime()}] [ERROR] ${message}`);
    },
}