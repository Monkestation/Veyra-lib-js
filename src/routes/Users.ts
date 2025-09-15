import type { VeyraClient } from "../client.js";
import type { User, UserResolvable, UserRole } from "../types.js";
import { processUsers } from "../utils.js";

export class Users {
  private cache: Map<number, User> = new Map();
  private usernameCache: Map<string, User> = new Map();
  private lastFetched: number = 0;
  private cacheTTL: number = 5 * 60 * 1000;

  constructor(private client: VeyraClient) {}

  /**
   * Get user details
   * @param userResolvable
   * @param force Forcefully fetch the requested user instead of from cache if available.
   * @returns {User | undefined}
   */
  async get(
    userResolvable: UserResolvable,
    force: boolean = false
  ): Promise<User | undefined> {
    const isCacheStale = Date.now() - this.lastFetched > this.cacheTTL;

    if (force || this.cache.size === 0 || isCacheStale) {
      await this.getAll();
    }

    if (typeof userResolvable === "object" && userResolvable !== null) {
      return this.cache.get(userResolvable.id);
    }

    if (typeof userResolvable === "number") {
      return this.cache.get(userResolvable);
    }

    if (typeof userResolvable === "string") {
      return this.usernameCache.get(userResolvable);
    }

    return undefined;
  }

  async getAll() {
    const { users } = await this.client.request<{ users: User[] }>(
      `/api/v1/users`
    );

    this.cache.clear();
    this.usernameCache.clear();
    for (const user of users) {
      this.cache.set(user.id, user);
      this.usernameCache.set(user.username, user);
    }
    this.lastFetched = Date.now();
    return users;
  }

  create(username: string, password: string, role: UserRole = "user") {
    return this.client.request<{ message: string; id: number }>("/api/users", {
      method: "POST",
      body: JSON.stringify({ username, password, role }),
    });
  }

  async updateRole(identifier: UserResolvable, role: UserRole) {
    const user = await this.get(identifier);
    if (!user) throw new UserNotFoundError(user);
    
    return this.client.request<{ message: string }>(`/api/users/${user.id}`, {
      method: "PUT",
      body: JSON.stringify({ role }),
    });
  }

  async delete(identifier: UserResolvable) {
    const user = await this.get(identifier);
    if (!user) throw new UserNotFoundError(user);

    return this.client.request<{ message: string }>(`/api/users/${user?.id }`, {
      method: "DELETE",
    });
  }
}

class UserNotFoundError extends Error {
  code: string;
  constructor(user?: UserResolvable) {
    super(`Could not resolve the requested user${user ? `: ${(user as User)?.id || (user as User)?.username || user}` : ""}`);
    this.code = "UserNotFound"
  }
}