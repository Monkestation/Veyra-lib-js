import { ActivityLogs } from "./routes/ActivityLogs.js";
import { Analytics } from "./routes/Analytics.js";
import { Auth } from "./routes/Auth.js";
import { type UserInstance, Users } from "./routes/Users.js";
import { Verifications } from "./routes/Verifications.js";
import type { VeyraClientOptions } from "./types.js";
import { isTokenExpired } from "./utils.js";

export class VeyraClient {
  private baseUrl: string;
  private token?: string;
  private username: string;
  private password: string;
  public currentUser?: UserInstance;

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
    const { token, user } = await this.Auth.login(this.username, this.password);
    this.token = token;
    this.currentUser = await this.Users.get(user);
    // This is where I would put my websocket client... IF I HAD ONE!!!
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

    const url = new URL(path, this.baseUrl);
    let retried = false;

    if (this.token && isTokenExpired(this.token)) {
      console.log("Token expired. Attempting to refresh.");
      await this.login();
    }

    const attemptRequest = async (token: string) => {
      const headers = setAuthorizationHeader(token);
      return fetch(url.toString(), { ...options, headers });
    };

    let res = await attemptRequest(this.token || "");

    if (res.status === 401 && !retried) {
      retried = true;
      await this.login();
      res = await attemptRequest(this.token || "");
    }

    const contentType = res.headers.get("Content-Type") || "";
    let responseBody: any;
    try {
      if (contentType.includes("application/json")) {
        responseBody = await res.json();
      } else {
        responseBody = await res.text();
      }
    } catch (parseError) {
      console.error("Failed to parse response body", parseError);
      // If parsing fails, we'll treat it as an empty body.
      responseBody = {};
    }

    if (!res.ok) {
      let errorMessage = "Unknown error";
      if (typeof responseBody === 'object' && responseBody !== null) {
        // If the body is an object, stringify it for a readable error message
        errorMessage = JSON.stringify(responseBody, null, 2);
      } else if (typeof responseBody === 'string' && responseBody.trim() !== "") {
        // If the body is a non-empty string, use it directly
        errorMessage = responseBody;
      }

      // Fallback to a simpler message if the above fails
      if (res.statusText) {
        errorMessage = res.statusText;
      }

      const apiError = new Error(
        `Request failed: ${res.status} – ${errorMessage}`,
        {
          cause: {
            status: res.status,
            body: responseBody,
            url: url.toString(),
            method: options.method || "GET",
          },
        }
      );

      throw apiError;
    }

    return responseBody as T;
  }
  private normalizeUrl(url: string): string {
    return url.replace(/\/$/, "");
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }
}


