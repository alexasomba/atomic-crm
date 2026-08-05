import type { AuthProvider } from "ra-core";
import { canAccess } from "../commons/canAccess";

const apiOrigin = (import.meta.env.VITE_CLOUDFLARE_API_URL ?? "").replace(
  /\/$/,
  "",
);

const authRequest = async <T>(path: string, init?: RequestInit) => {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  const response = await fetch(`${apiOrigin}/api/auth${path}`, {
    ...init,
    credentials: "include",
    headers,
  });
  const body = (await response.json().catch(() => ({}))) as T & {
    error?: { message?: string };
  };
  if (!response.ok)
    throw new Error(body.error?.message ?? "Authentication failed");
  return body;
};

type SessionResponse = {
  user: { id: string; name: string; email: string; image?: string | null };
};

export const authProvider: AuthProvider = {
  async login({ email, password }) {
    await authRequest("/sign-in/email", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },
  async logout() {
    await authRequest("/sign-out", { method: "POST", body: "{}" });
  },
  async checkAuth() {
    await authRequest<SessionResponse>("/get-session");
  },
  async checkError(error) {
    if (error?.status === 401 || error?.status === 403) throw error;
  },
  async getIdentity() {
    const session = await authRequest<SessionResponse>("/get-session");
    return {
      id: session.user.id,
      fullName: session.user.name,
      avatar: session.user.image ?? undefined,
      administrator: false,
    };
  },
  async canAccess(params) {
    const identity = await this.getIdentity!();
    return canAccess(identity.administrator ? "admin" : "user", params);
  },
  async resetPassword({ email }: { email: string }) {
    await authRequest("/request-password-reset", {
      method: "POST",
      body: JSON.stringify({
        email,
        redirectTo: `${window.location.origin}/reset-password`,
      }),
    });
  },
  async setPassword({ token, password }: { token: string; password: string }) {
    await authRequest("/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, newPassword: password }),
    });
  },
};
