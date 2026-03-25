import { SdkProvider } from "@backoffice/sdk-react";
import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app";
import "@backoffice/ui/globals.css";

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

createRoot(root).render(
  <React.StrictMode>
    <SdkProvider apiBaseUrl={import.meta.env.VITE_API_BASE_URL ?? ""}>
      <App />
    </SdkProvider>
  </React.StrictMode>
);
