export const appConfig = {
  apiBaseUrl: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  pollingInterval: 8000,
  tokenKey: 'token',
};
