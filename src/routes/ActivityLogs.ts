import type { VeyraClient } from "../client.js";
import type { APIActivity } from "../types.js";
import type { Users, UserInstance } from "./Users.js";

export interface EnrichedActivity extends APIActivity {
	// user_id: never;
  user?: UserInstance;
}

export class ActivityLogs {
  constructor(
    private client: VeyraClient,
  ) {}

  async get(
    page = 1,
    limit = 50
  ): Promise<{
    activities: APIActivity[];
    page: number;
    limit: number;
  }> {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });

    const response = await this.client.request<{
      activities: APIActivity[];
      page: number;
      limit: number;
    }>(`/api/activity?${params}`);

    const enrichedActivities: EnrichedActivity[] = await Promise.all(response.activities.map(
      async (log) => {
        const user =
          await this.client.Users.get(log.user_id)

        return {
          ...log,
          created_at: new Date(log.created_at),
          user,
        };
      }
    ));

    return {
      activities: enrichedActivities,
      page: response.page,
      limit: response.limit,
    };
  }
}
