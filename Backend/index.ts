import 'dotenv/config';
import app from './app.js';

/** Puerto en el que escucha el servidor; se puede sobreescribir con la variable PORT. */
const PORT = parseInt(process.env.PORT ?? '3000', 10);

app.listen(PORT, () => {
  console.log(`[SERVER] Sistema Bancario UP running on port ${PORT}`);
  console.log(`[SERVER] Environment: ${process.env.NODE_ENV ?? 'development'}`);
});
