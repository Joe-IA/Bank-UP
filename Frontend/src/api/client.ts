import axios from 'axios';

/**
 * Instancia de Axios preconfigurada para el API de Bank UP.
 * La URL base se puede sobreescribir con la variable de entorno VITE_API_URL.
 */
const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api',
});

// Interceptor que adjunta el JWT de localStorage en cada petición autenticada.
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default client;
