export interface AppRuntimeConfig {
  apiBaseUrl: string;
  appEnv: "development" | "staging" | "production";
}

export function getAppConfig(): AppRuntimeConfig {
  return {
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? "",
    appEnv: (import.meta.env.VITE_APP_ENV as AppRuntimeConfig["appEnv"]) ?? "development",
  };
}
