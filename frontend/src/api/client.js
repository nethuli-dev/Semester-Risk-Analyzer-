import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

// The access token lives only in memory (module scope here, mirrored into
// AuthContext state for React to react to) — never localStorage, since
// it's short-lived and meant to be recoverable via the httpOnly refresh
// cookie instead.
let accessToken = null;
let onAuthExpired = () => {};

export function setAccessToken(token) {
  accessToken = token;
}

export function setOnAuthExpired(callback) {
  onAuthExpired = callback;
}

const client = axios.create({
  baseURL: API_URL,
  withCredentials: true, // sends the httpOnly refresh cookie automatically
});

client.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Multiple requests can 401 at once (e.g. a page that fires several
// queries on mount after the access token expired); sharing one in-flight
// refresh call instead of firing one per request avoids a stampede that
// could also trip the rate limiter.
let refreshPromise = null;

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isAuthEndpoint = originalRequest?.url?.startsWith('/auth/');

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;
      try {
        if (!refreshPromise) {
          refreshPromise = axios
            .post(`${API_URL}/auth/refresh`, {}, { withCredentials: true })
            .finally(() => {
              refreshPromise = null;
            });
        }
        const { data } = await refreshPromise;
        setAccessToken(data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return client(originalRequest);
      } catch (refreshError) {
        setAccessToken(null);
        onAuthExpired();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default client;
