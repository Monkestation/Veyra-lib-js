import type { VeyraClient } from "../client.js";
import type { AnalyticsResponse } from "../types.js";

export class Analytics {
	constructor(private client: VeyraClient) {}

	get() {
		return this.client.request<AnalyticsResponse>("/api/analytics");
	}
}
