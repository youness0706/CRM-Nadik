import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1';

// Create a configured Axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Set a reasonable timeout
  timeout: 15000, 
});

// Request interceptor to attach access token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle errors and token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Prevent infinite loops if refresh fails
    if (error.response?.status === 401 && originalRequest.url === '/auth/refresh/') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      window.location.href = '/';
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && originalRequest.url === '/auth/login/') {
      return Promise.reject(error);
    }

    // Handle Token Refresh on 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');
      
      if (refreshToken) {
        try {
          // Use axios directly to avoid interceptor loop
          const response = await axios.post(`${API_BASE_URL}/auth/refresh/`, {
            refresh: refreshToken
          });
          
          const newAccessToken = response.data.access;
          localStorage.setItem('access_token', newAccessToken);
          
          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return apiClient(originalRequest);
        } catch (refreshError) {
          // Refresh failed (expired/invalid)
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/';
          return Promise.reject(refreshError);
        }
      } else {
        // No refresh token available
        localStorage.removeItem('access_token');
        window.location.href = '/';
      }
    }
    
    // Normalize and propagate the error for UI consumption
    return Promise.reject(error);
  }
);

export default apiClient;
