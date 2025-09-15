import type { VeyraClient } from "../client.js";
import { resolveUser } from "../internalClient.js";
import type { User, UserRole } from "../types.js";
import { processUsers } from "../utils.js";

export class Users {
	constructor(private client: VeyraClient) {}

	async get(identifier: string | number | User) {
    return resolveUser(this.client, identifier);
	}

	async getAll() {
		const response = await this.client.request<{ users: User[] }>("/api/users");
		return processUsers(response.users);
	}

	create(username: string, password: string, role: UserRole = "user") {
		return this.client.request<{ message: string; id: number }>("/api/users", {
			method: "POST",
			body: JSON.stringify({ username, password, role }),
		});
	}

	updateRole(id: number, role: UserRole) {
		return this.client.request<{ message: string }>(`/api/users/${id}`, {
			method: "PUT",
			body: JSON.stringify({ role }),
		});
	}

	delete(id: number) {
		return this.client.request<{ message: string }>(`/api/users/${id}`, {
			method: "DELETE",
		});
	}
}
