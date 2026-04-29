import axios from "axios";

const api = axios.create({
  baseURL: "http://192.168.101.3:5000/api",
});

api.interceptors.request.use((config) => {
  const loginPath = "/auth/web-login";
  const token = sessionStorage.getItem("token");

  config.headers = config.headers ?? {};
  config.headers["Content-Type"] = "application/json";

  const requestUrl = typeof config.url === "string" ? config.url : "";
  const isLoginRequest = requestUrl.endsWith(loginPath) || requestUrl.includes(loginPath);

  if (!isLoginRequest && token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;

