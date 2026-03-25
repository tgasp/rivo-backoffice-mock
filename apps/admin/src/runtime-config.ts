declare global {
  interface Window {
    __APP_CONFIG__?: {
      VITE_API_BASE_URL?: string;
      VITE_APP_ENV?: string;
    };
  }
}

export function getRuntimeConfig() {
  return {
    apiBaseUrl: window.__APP_CONFIG__?.VITE_API_BASE_URL ?? import.meta.env.VITE_API_BASE_URL ?? "",
    appEnv: window.__APP_CONFIG__?.VITE_APP_ENV ?? import.meta.env.VITE_APP_ENV ?? "development",
  };
}
