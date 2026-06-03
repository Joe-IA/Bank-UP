import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['Backend/__tests__/**/*.test.ts'],
    env: {
      DB_PATH: ':memory:',
      JWT_SECRET: 'test-secret-bank-up-32chars-min!!',
      NODE_ENV: 'test',
      MIN_TRANSFER_AMOUNT: '10',
      MAX_ACCOUNT_BALANCE: '10000',
      DAILY_TRANSFER_LIMIT: '3000',
      MAX_LOGIN_ATTEMPTS: '3',
      PORT: '3001',
    },
  },
});
