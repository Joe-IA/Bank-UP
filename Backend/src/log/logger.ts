const getTime = () => {
    return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

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