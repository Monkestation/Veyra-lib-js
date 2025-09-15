import type { VeyraClient } from "../client.js";
import type { Activity } from "../types.js";

export class ActivityLogs {
	constructor(private client: VeyraClient) {}

	async get(page = 1, limit = 50) {
		const params = new URLSearchParams({
			page: String(page),
			limit: String(limit),
		});
		const response = await this.client.request<{
			activities: Activity[];
			page: number;
			limit: number;
		}>(`/api/activity?${params}`);
		response.activities = response.activities.map((log) => {
			return {
				...log,
				created_at: new Date(log.created_at),
			};
		});
		return response;
	}
}
