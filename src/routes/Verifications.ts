import type { VeyraClient } from "../client.js";
import type { Verification } from "../types.js";
import { processVerifications } from "../utils.js";

export class Verifications {
  constructor(private client: VeyraClient) {}

  async getByDiscord(discordId: string) {
    const verification = await this.client.request<Verification>(
      `/api/v1/verify/${discordId}`
    );
    return processVerifications(verification);
  }

  async getByCkey(ckey: string) {
    const verification = await this.client.request<Verification>(
      `/api/v1/verify/ckey/${ckey}`
    );
    return processVerifications(verification);
  }

  async bulkByDiscord(discordIds: string[]) {
    const { verifications } = await this.client.request<{
      verifications: Verification[];
    }>("/api/v1/verify/bulk/discord", {
      method: "POST",
      body: JSON.stringify({ discord_ids: discordIds }),
    });
    return processVerifications(verifications);
  }

  async bulkByCkey(ckeys: string[]) {
    const { verifications } = await this.client.request<{
      verifications: Verification[];
    }>("/api/v1/verify/bulk/ckey", {
      method: "POST",
      body: JSON.stringify({ ckeys }),
    });
    return processVerifications(verifications);
  }

  async getAll(page = 1, limit = 50, search = "") {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      search,
    });
    const { verifications, ...rest } = await this.client.request<{
      verifications: Verification[];
      page: number;
      limit: number;
    }>(`/api/v1/verify?${params}`);

    return {
      verifications: await processVerifications(verifications),
      ...rest,
    };
  }

  async createOrUpdate(payload: {
    discord_id: string;
    ckey: string;
    verified_flags?: Record<string, boolean>;
    verification_method?: string;
  }) {
    const verification = await this.client.request<Verification>(
      "/api/v1/verify",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
    return processVerifications(verification);
  }

  updateDiscord(discordId: string, updates: Partial<Verification>) {
    return this.client.request<{ message: string }>(
      `/api/v1/verify/${discordId}`,
      { method: "PUT", body: JSON.stringify(updates) }
    );
  }

  updateCkey(ckey: string, updates: Partial<Verification>) {
    return this.client.request<{ message: string }>(
      `/api/v1/verify/ckey/${ckey}`,
      { method: "PUT", body: JSON.stringify(updates) }
    );
  }

  deleteDiscord(discordId: string) {
    return this.client.request<{ message: string }>(
      `/api/v1/verify/${discordId}`,
      { method: "DELETE" }
    );
  }

  deleteCkey(ckey: string) {
    return this.client.request<{ message: string }>(
      `/api/v1/verify/ckey/${ckey}`,
      { method: "DELETE" }
    );
  }
}
