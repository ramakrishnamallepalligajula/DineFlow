
const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  "http://localhost:3000"
).replace(/\/+$/, "");

export const apiFetch = async (endpoint, options = {}) => {
  // AuthContext stores the JWT in sessionStorage.
  // Keep localStorage as a fallback for older sessions.
  const token =
    sessionStorage.getItem("token") ||
    localStorage.getItem("token");

  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  } else {
    console.warn(
      "[apiFetch] No authentication token found for:",
      endpoint
    );
  }

  return fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });
};
