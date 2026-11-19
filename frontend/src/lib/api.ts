// Calls the Spring Boot API. Paths are relative, so the site works on any domain.
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function api<T = unknown>(method: string, url: string, body?: unknown, isForm = false): Promise<T> {
  const res = await fetch(url, {
    method,
    credentials: "same-origin",
    headers: isForm || body === undefined ? {} : { "Content-Type": "application/json" },
    body: isForm ? (body as BodyInit) : body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    let message = "Request failed";
    try {
      message = (await res.json()).error || message;
    } catch {
      /* not JSON */
    }
    throw new ApiError(message, res.status);
  }
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

export type Me = { email: string; role: "admin" | "user"; displayName?: string };
export const getMe = () => api<Me>("GET", "/api/auth/me").catch(() => null);
