import { useAuth } from '../contexts/AuthContext';

/**
 * Simple wrapper around fetch that automatically prefixes the API base URL
 * and attaches the bearer token when available. This acts as middleware so
 * that individual components don't need to repeat the authentication logic.
 */
const useApi = () => {
  const { token } = useAuth();
  const baseUrl = import.meta.env.VITE_API_URL;

  return (path: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers || {});
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    return fetch(`${baseUrl}${path}`, { ...options, headers });
  };
};

export default useApi;
