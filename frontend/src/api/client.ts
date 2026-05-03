const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

type RequestOptions = RequestInit & {
  download?: boolean;
};

export class ApiError extends Error {
  issues?: Record<string, string[]>;

  constructor(message: string, issues?: Record<string, string[]>) {
    super(message);
    this.name = "ApiError";
    this.issues = issues;
  }
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {})
    },
    ...options
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: "Request failed" }));
    throw new ApiError(body.message ?? "Request failed", body.issues);
  }

  if (response.status === 204) return undefined as T;
  if (options.download) return response.blob() as Promise<T>;
  return response.json() as Promise<T>;
}

export function authUrl() {
  return `${API_URL}/auth/google`;
}

export function downloadUrl(path: string) {
  return `${API_URL}${path}`;
}
