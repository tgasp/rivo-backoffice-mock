export interface AppConfig {
  apiBaseUrl: string;
  appEnv: "development" | "staging" | "production";
}

export function getConfig(): AppConfig {
  return {
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? "",
    appEnv: (import.meta.env.VITE_APP_ENV as AppConfig["appEnv"]) ?? "development",
  };
}
