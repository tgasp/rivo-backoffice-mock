import type { OperatorSession } from "@backoffice/sdk-core/types";

const OPERATOR_SESSION_STORAGE_KEY = "operator_session";

export function getStoredOperatorSession(): OperatorSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawSession = window.localStorage.getItem(OPERATOR_SESSION_STORAGE_KEY);
  if (!rawSession) {
    return null;
  }

  try {
    return JSON.parse(rawSession) as OperatorSession;
  } catch {
    window.localStorage.removeItem(OPERATOR_SESSION_STORAGE_KEY);
    return null;
  }
}

export function storeOperatorSession(session: OperatorSession): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(OPERATOR_SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearStoredOperatorSession(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(OPERATOR_SESSION_STORAGE_KEY);
}
