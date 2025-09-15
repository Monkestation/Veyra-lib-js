import type { VeyraClient } from "../client.js";
import type { AuthResponse } from "../types.js";

export class Auth {
	constructor(private client: VeyraClient) {}

	login(username: string, password: string) {
		return this.client.request<AuthResponse>("/api/auth/login", {
			method: "POST",
			body: JSON.stringify({ username, password }),
		});
	}

	changePassword(currentPassword: string, newPassword: string) {
		return this.client.request<{ message: string }>(
			"/api/auth/change-password",
			{
				method: "POST",
				body: JSON.stringify({ currentPassword, newPassword }),
			},
		);
	}
}
