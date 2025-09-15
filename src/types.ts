export interface AuthResponse {
	token: string;
	user: UserPartial;
}
export interface VeyraClientOptions {
  baseUrl: string;
  username: string;
  password: string;
}

export type UserRole = "user" | "admin";

export interface User {
	id: number;
	username: string;
	role: UserRole;
	created_at: Date;
}

export type UserPartial = Omit<User, "created_at">;
export type UserResolvable = number | string | User | UserPartial;

export interface Verification {
	discord_id: string;
	ckey: string;
	verified_flags: Record<string, boolean>;
	verification_method: string;
	verified_by: string;
	created_at: Date;
	updated_at: Date | null;
}

export interface AnalyticsResponse {
	total_verifications: number;
	recent_verifications: number;
	weekly_verifications: number;
	total_users: number;
	verification_methods: { verification_method: string; count: number }[];
	daily_verifications: { date: string; count: number }[];
}

export interface Activity {
	id: number;
	user_id: number;
	activity_type: string;
	activity_data: string | null;
	created_at: Date;
	username: string;
}

type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
