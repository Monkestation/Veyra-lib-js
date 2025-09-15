import type { VeyraClient } from "../client.js";
import type { AuthResponse } from "../types.js";

export class Auth {
  constructor(private client: VeyraClient) {}

  async login(username: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${this.client.getBaseUrl()}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || "Login failed.");
    }

    const data = await res.json();
    return data;
  }

  changePassword(currentPassword: string, newPassword: string) {
    return this.client.request<{ message: string }>(
      "/api/auth/change-password",
      {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      }
    );
  }
}
