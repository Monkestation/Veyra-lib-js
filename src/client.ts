import { ActivityLogs } from "./routes/ActivityLogs.js";
import { Analytics } from "./routes/Analytics.js";
import { Auth } from "./routes/Auth.js";
import { Users } from "./routes/Users.js";
import { Verifications } from "./routes/Verifications.js";

export class VeyraClient {
  private baseUrl: string;
  private token?: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.Auth = new Auth(this);
    this.Users = new Users(this);
    this.Verifications = new Verifications(this);
    this.Analytics = new Analytics(this);
    this.Activity = new ActivityLogs(this);
  }

  setToken(token: string) {
    this.token = token;
  }

  async request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };
    if (this.token) headers.Authorization = `Bearer ${this.token}`;

    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err || `Request failed: ${res.status}`);
    }

    return res.json() as Promise<T>;
  }

  public Auth: Auth;
  public Users: Users;
  public Verifications: Verifications;
  public Analytics: Analytics;
  public Activity: ActivityLogs;
}


