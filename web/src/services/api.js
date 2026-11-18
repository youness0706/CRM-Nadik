import axios from 'axios';

const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL;
if (import.meta.env.PROD && !configuredApiBaseUrl) {
  throw new Error('VITE_API_BASE_URL must be configured for production builds.');
}

export const API_BASE_URL = configuredApiBaseUrl || '/api/v1';

// Create a configured Axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Set a reasonable timeout
  timeout: 15000, 
});

// Keep the authenticated profile in memory for the lifetime of the SPA.
// The layout is remounted on navigation, so without this cache every page
// transition made another round trip to the backend for the same user data.
let currentUserPromise = null;
let refreshTokenPromise = null;

export const getCurrentUser = (force = false) => {
  if (!force && currentUserPromise) return currentUserPromise;
  currentUserPromise = apiClient.get('/auth/me/').then((response) => (
    response.data.data ?? response.data
  )).catch((error) => {
    currentUserPromise = null;
    throw error;
  });
  return currentUserPromise;
};

export const clearCurrentUserCache = () => {
  currentUserPromise = null;
};

const clearAuthSession = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  clearCurrentUserCache();
  window.location.href = '/';
};

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

    if (!originalRequest || error.response?.status !== 401) {
      return Promise.reject(error);
    }

    // Prevent infinite loops if refresh fails
    if (originalRequest.url === '/auth/refresh/') {
      clearAuthSession();
      return Promise.reject(error);
    }

    if (originalRequest.url === '/auth/login/') {
      return Promise.reject(error);
    }

    // Handle Token Refresh on 401 Unauthorized
    if (!originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');
      
      if (refreshToken) {
        try {
          if (!refreshTokenPromise) {
            refreshTokenPromise = axios.post(`${API_BASE_URL}/auth/refresh/`, {
              refresh: refreshToken
            }).then(({ data }) => {
              if (!data?.access) {
                throw new Error('The refresh endpoint did not return an access token.');
              }
              localStorage.setItem('access_token', data.access);
              if (data.refresh) {
                localStorage.setItem('refresh_token', data.refresh);
              }
              return data.access;
            }).finally(() => {
              refreshTokenPromise = null;
            });
          }
          const newAccessToken = await refreshTokenPromise;
          
          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return apiClient(originalRequest);
        } catch (refreshError) {
          const refreshStatus = refreshError.response?.status;
          if (refreshStatus === 400 || refreshStatus === 401) {
            clearAuthSession();
          }
          return Promise.reject(refreshError);
        }
      } else {
        // No refresh token available
        clearAuthSession();
      }
    }
    
    // Normalize and propagate the error for UI consumption
    return Promise.reject(error);
  }
);

export default apiClient;
