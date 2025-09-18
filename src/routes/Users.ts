import type { VeyraClient } from "../client.js";
import type { APIUser, UserResolvable, UserRole } from "../types.js";
import { parseUsers } from "../utils.js";

export class UserInstance {
  deleted: any;
  constructor(
    public client: VeyraClient,
    protected usersManager: Users,
    public data: APIUser
  ) {
    // socket.on("userUpdate", (data: APIUser) => {
    //   const instance = usersManager.getFromRegistry(data.id);
    //   if (instance) {
    //     instance.data = parseUsers(data); // live update
    //   }
    // });
  }

  get id() {
    return this.data.id;
  }

  get isAdmin() {
    return this.data.role === "admin";
  }

  get username() {
    return this.data.username;
  }

  async fetch(): Promise<UserInstance> {
    const latest = await this.usersManager.get(this.data.id);
    if (!latest) throw new UserNotFoundError(this.data.id);
    this.data = latest.data;
    return this;
  }

  async updateRole(role: UserRole): Promise<void> {
    await this.usersManager.updateRole(this.data.id, role);
    await this.fetch();
  }

  async delete(): Promise<void> {
    await this.usersManager.delete(this.data.id);
  }
}

export class Users {
  protected registry: Map<number, UserInstance> = new Map();

  constructor(public client: VeyraClient) {}

  protected createInstance(user: APIUser): UserInstance {
    const parsed = parseUsers(user);
    const existing = this.registry.get(parsed.id);
    if (existing) {
      existing.data = parsed;
      return existing;
    }

    const instance = new UserInstance(this.client, this, parsed);
    this.registry.set(parsed.id, instance);
    return instance;
  }

  getFromRegistry(id: number): UserInstance | undefined {
    return this.registry.get(id);
  }

  async get(userResolvable: UserResolvable): Promise<UserInstance | undefined> {
    let idOrUsername: string | number;

    if (typeof userResolvable === "object" && userResolvable !== null) {
      idOrUsername = userResolvable.id;
    } else {
      idOrUsername = userResolvable;
    }

    try {
      const user = await this.client.request<APIUser>(
        `/api/users/${idOrUsername}`
      );
      return this.createInstance(user);
    } catch (err) {
      if ((err as any)?.cause.status === 404) {
        return;
      }
      throw err;
    }
  }

  async getAll(): Promise<UserInstance[]> {
    const { users } = await this.client.request<{ users: APIUser[] }>(
      `/api/users`
    );

    return users.map((user) => this.createInstance(user));
  }

  async create(
    username: string,
    password: string,
    role: UserRole = "user"
  ): Promise<UserInstance> {
    const { id } = await this.client.request<{ message: string; id: number }>(
      "/api/users",
      {
        method: "POST",
        body: JSON.stringify({ username, password, role }),
      }
    );

    const user = await this.get(id);
    if (!user) throw new Error("Failed to retrieve created user");
    return user;
  }

  async updateRole(identifier: UserResolvable, role: UserRole): Promise<void> {
    const user = await this.get(identifier);
    if (!user) throw new UserNotFoundError(identifier);

    await this.client.request<{ message: string }>(`/api/users/${user.id}`, {
      method: "PUT",
      body: JSON.stringify({ role }),
    });
  }

  async delete(identifier: UserResolvable): Promise<void> {
    const user = await this.get(identifier);
    if (!user) throw new UserNotFoundError(identifier);

    if (user.deleted) {
      if (this.registry.has(user.id)) this.registry.delete(user.id);
      user.deleted = true;
      return;
    }

    user.deleted = true;

    await this.client.request<{ message: string }>(`/api/users/${user.id}`, {
      method: "DELETE",
    });

    this.registry.delete(user.id);
  }
}

class UserNotFoundError extends Error {
  code: string;

  constructor(user?: UserResolvable) {
    super(
      `Could not resolve the requested user${
        user
          ? `: ${(user as APIUser)?.id || (user as APIUser)?.username || user}`
          : ""
      }`
    );
    this.code = "UserNotFound";
    this.name = "UserNotFoundError";
  }
}
