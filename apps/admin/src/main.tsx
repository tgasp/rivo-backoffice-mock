import { SdkProvider } from "@backoffice/sdk-react";
import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app";
import { getRuntimeConfig } from "./runtime-config";
import "@backoffice/ui/globals.css";

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");
const runtimeConfig = getRuntimeConfig();

createRoot(root).render(
  <React.StrictMode>
    <SdkProvider apiBaseUrl={runtimeConfig.apiBaseUrl}>
      <App />
    </SdkProvider>
  </React.StrictMode>
);
