import { ActivityLogs } from "./routes/ActivityLogs.js";
import { Analytics } from "./routes/Analytics.js";
import { Auth } from "./routes/Auth.js";
import { Users } from "./routes/Users.js";
import { Verifications } from "./routes/Verifications.js";
import type { User, VeyraClientOptions } from "./types.js";
import { isTokenExpired } from "./utils.js";

export class VeyraClient {
  private baseUrl: string;
  private token?: string;
  private username: string;
  private password: string;
  public currentUser?: User;

  public Auth: Auth;
  public Users: Users;
  public Verifications: Verifications;
  public Analytics: Analytics;
  public Activity: ActivityLogs;

  constructor(options: VeyraClientOptions) {
    const { baseUrl, username, password } = options;

    this.baseUrl = this.normalizeUrl(baseUrl);

    this.username = username;
    this.password = password;

    this.Auth = new Auth(this);
    this.Users = new Users(this);
    this.Verifications = new Verifications(this);
    this.Analytics = new Analytics(this);
    this.Activity = new ActivityLogs(this);
  }

  async login() {
    const {token, user} = await this.Auth.login(this.username, this.password);
    this.token = token;
    this.currentUser = await this.Users.get(user);
  }

  setToken(token: string) {
    this.token = token;
  }

  async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const setAuthorizationHeader = (token: string): Record<string, string> => {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(options.headers as Record<string, string>),
      };
      headers.Authorization = `Bearer ${token}`;
      return headers;
    };

    const attemptRequest = async (token?: string) => {
      const headers = setAuthorizationHeader(token || this.token || "");
      const res = await fetch(`${this.baseUrl}${path}`, {
        ...options,
        headers,
      });
      return res;
    };

    if (this.token && isTokenExpired(this.token)) {
      console.log("Token expired. Attempting to refresh.");
      await this.login();
    }

    let res = await attemptRequest(this.token);

    if (res.status === 401) {
      console.log("Unauthorized request. Attempting token refresh and retry.");
      await this.login();
      res = await attemptRequest(this.token);
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err || `Request failed: ${res.status}`);
    }

    return res.json() as Promise<T>;
  }

  private normalizeUrl(url: string): string {
    return url.replace(/\/$/, "");
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }
}


