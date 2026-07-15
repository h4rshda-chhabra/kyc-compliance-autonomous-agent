import axios from "axios";

export const TOKEN_KEY = "access_token";
export const SESSION_EXPIRED_KEY = "session_expired";

const baseURL = `${import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000"}/api/v1`;

export const apiClient = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Login/register failures (wrong password, deactivated account, duplicate email)
// are form-level errors, not signs of an invalid session — don't treat them as logout triggers.
const AUTH_ENDPOINTS = ["/auth/login", "/auth/register"];

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url: string = error.config?.url ?? "";
    const isAuthEndpoint = AUTH_ENDPOINTS.some((endpoint) => url.includes(endpoint));

    if ((status === 401 || status === 403) && !isAuthEndpoint) {
      // A token existing before we cleared it means the user had a live session
      // that just got invalidated — as opposed to an anonymous visitor hitting
      // a protected route, who shouldn't see an "expired" message they never earned.
      const hadSession = Boolean(localStorage.getItem(TOKEN_KEY));
      localStorage.removeItem(TOKEN_KEY);
      if (window.location.pathname !== "/login") {
        if (hadSession) {
          sessionStorage.setItem(SESSION_EXPIRED_KEY, "1");
        }
        window.location.assign("/login");
      }
    }

    return Promise.reject(error);
  }
);
