import { createClient } from "@/lib/supabase/client";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000"
).replace(/\/$/, "");

export class ApiError extends Error {
  status: number;
  code: string;
  details: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function getAccessToken(): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new ApiError(401, "session_error", error.message);
  if (!data.session?.access_token) {
    throw new ApiError(401, "authentication_required", "Please sign in again.");
  }
  return data.session.access_token;
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = await getAccessToken();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Content-Type", "application/json");

  const response = await fetch(`${API_BASE_URL}/api/v1${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => null)) as
    | { data?: T; error?: { code?: string; message?: string; details?: unknown } }
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload?.error?.code ?? "api_error",
      payload?.error?.message ?? "The API request failed.",
      payload?.error?.details,
    );
  }
  return payload as T;
}

export async function apiData<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const payload = await apiRequest<{ data: T }>(path, init);
  return payload.data;
}

/**
 * Sends a request without forcing a JSON content type, so multipart bodies
 * keep their own boundary. Returns the parsed body, or null on 204.
 */
export async function apiRaw<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<T | null> {
  const token = await getAccessToken();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}/api/v1${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: { code?: string; message?: string; details?: unknown } }
      | null;
    throw new ApiError(
      response.status,
      payload?.error?.code ?? "api_error",
      payload?.error?.message ?? "The API request failed.",
      payload?.error?.details,
    );
  }

  if (response.status === 204) return null;
  return (await response.json().catch(() => null)) as T | null;
}

export function publicApiUrl(path: string): string {
  return `${API_BASE_URL}/api/v1${path}`;
}
