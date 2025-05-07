import axios from 'axios';
import { fetchAuthSession } from '@aws-amplify/auth';

// Create an axios instance with base URL from environment variables
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Add request interceptor to add authentication token to requests
api.interceptors.request.use(
  async (config) => {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // User is not authenticated - proceed without token
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
