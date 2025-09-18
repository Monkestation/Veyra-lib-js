import type { VeyraClient } from "../client.js";
import type { APIVerification, VerificationMethod } from "../types.js";
import { parseVerifications } from "../utils.js";

export class VerificationInstance {
  public deleted: boolean = false;
  constructor(
    public client: VeyraClient,
    private verificationsManager: Verifications,
    public data: APIVerification
  ) {}

  get discordId(): string {
    return this.data.discord_id;
  }

  get ckey(): string {
    return this.data.ckey;
  }

  get verifiedFlags() {
    return this.data.verified_flags;
  }

  get verificationMethod(): VerificationMethod {
    return this.data.verification_method;
  }

  get verifiedBy(): string {
    return this.data.verified_by;
  }

  get createdAt(): Date {
    return new Date(this.data.created_at);
  }

  get updatedAt(): Date | null {
    return this.data.updated_at ? new Date(this.data.updated_at) : null;
  }

  hasBeenUpdated(): boolean {
    return this.updatedAt !== null;
  }

  // Actions
  async fetch(): Promise<VerificationInstance> {
    const latest = await this.verificationsManager.getByDiscord(
      this.discordId,
    );
    if (!latest) {
      this.deleted = true;
      return this;
    }
    this.data = latest.data;
    return this;
  }

  async update(updates: Partial<APIVerification>): Promise<void> {
    await this.verificationsManager.updateDiscord(this.discordId, updates);
    await this.fetch();
  }

  async delete(): Promise<void> {
    await this.verificationsManager.deleteDiscord(this.discordId);
  }
}

export class Verifications {
  private registryByDiscordId: Map<string, VerificationInstance> = new Map();
  private registryByCkey: Map<string, VerificationInstance> = new Map();

  constructor(private client: VeyraClient) {}

  protected createInstance(
    verification: APIVerification
  ): VerificationInstance {
    const { discord_id, ckey } = verification;

    let instance = this.registryByDiscordId.get(discord_id);

    if (instance) {
      instance.data = verification; // update existing instance
    } else {
      instance = new VerificationInstance(this.client, this, verification);
      this.registryByDiscordId.set(discord_id, instance);
      this.registryByCkey.set(ckey, instance);
    }

    return instance;
  }

  public getFromRegistryByDiscord(
    discordId: string
  ): VerificationInstance | undefined {
    return this.registryByDiscordId.get(discordId);
  }

  public getFromRegistryByCkey(ckey: string): VerificationInstance | undefined {
    return this.registryByCkey.get(ckey);
  }

  async getByDiscord(discordId: string): Promise<VerificationInstance | undefined> {
    try {
      const verification = await this.client.request<APIVerification>(
        `/api/v1/verify/${discordId}`
      );
      return this.createInstance(parseVerifications(verification));
    } catch (error) {
      if ((error as {cause: {status: number }}).cause.status === 404) 
        return;
      throw error;
    }
  }

  async getByCkey(ckey: string): Promise<VerificationInstance | undefined> {
    try {
      const verification = await this.client.request<APIVerification>(
        `/api/v1/verify/ckey/${ckey}`
      );
      return this.createInstance(parseVerifications(verification));
    } catch (error) {
      if ((error as { cause: { status: number } }).cause.status === 404) return;
      throw error;
    }

  }

  async bulkByDiscord(discordIds: string[]): Promise<VerificationInstance[]> {
    const { verifications } = await this.client.request<{
      verifications: APIVerification[];
    }>("/api/v1/verify/bulk/discord", {
      method: "POST",
      body: JSON.stringify({ discord_ids: discordIds }),
    });

    return parseVerifications(verifications).map((v) => this.createInstance(v));
  }

  async bulkByCkey(ckeys: string[]): Promise<VerificationInstance[]> {
    const { verifications } = await this.client.request<{
      verifications: APIVerification[];
    }>("/api/v1/verify/bulk/ckey", {
      method: "POST",
      body: JSON.stringify({ ckeys }),
    });

    return parseVerifications(verifications).map((v) => this.createInstance(v));
  }

  async getAll(page = 1, limit = 50, search = "") {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      search,
    });

    const { verifications, ...rest } = await this.client.request<{
      verifications: APIVerification[];
      page: number;
      limit: number;
    }>(`/api/v1/verify?${params}`);

    return {
      verifications: parseVerifications(verifications).map((v) =>
        this.createInstance(v)
      ),
      ...rest,
    };
  }

  async createOrUpdate(payload: {
    discord_id: string;
    ckey: string;
    verified_flags?: Record<string, boolean>;
    verification_method?: string;
  }): Promise<VerificationInstance> {
    await this.client.request(
      "/api/v1/verify",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
    return (await this.getByDiscord(payload.discord_id))!;
  }

  async updateDiscord(discordId: string, updates: Partial<APIVerification>) {
    try {
      return await this.client.request<{ message: string }>(
        `/api/v1/verify/${discordId}`,
        {
          method: "PUT",
          body: JSON.stringify(updates),
        }
      );
    } catch (error: any) {
      if (
        error?.response?.status === 400 &&
        error?.response?.data?.error === "No valid fields to update"
      ) {
        return { message: "No changes were necessary." };
      }
      throw error;
    }
  }

  async updateCkey(ckey: string, updates: Partial<APIVerification>) {
    try {
      return await this.client.request<{ message: string }>(
        `/api/v1/verify/ckey/${ckey}`,
        {
          method: "PUT",
          body: JSON.stringify(updates),
        }
      );
    } catch (error: any) {
      if (
        error?.response?.status === 400 &&
        error?.response?.data?.error === "No valid fields to update"
      ) {
        return { message: "No changes were necessary." };
      }
      throw error;
    }
  }
  deleteDiscord(discordId: string) {
    const instance = this.registryByDiscordId.get(discordId);
    if (instance) {
      instance.deleted = true;
      this.registryByDiscordId.delete(discordId);
      this.registryByCkey.delete(instance.ckey);
    }

    return this.client.request<{ message: string }>(
      `/api/v1/verify/${discordId}`,
      { method: "DELETE" }
    );
  }

  deleteCkey(ckey: string) {
    const instance = this.registryByCkey.get(ckey);
    if (instance) {
      instance.deleted = true;
      this.registryByCkey.delete(ckey);
      this.registryByDiscordId.delete(instance.discordId);
    }

    return this.client.request<{ message: string }>(
      `/api/v1/verify/ckey/${ckey}`,
      { method: "DELETE" }
    );
  }
}

