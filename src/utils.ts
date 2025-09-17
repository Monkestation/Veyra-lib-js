import type { APIUser, APIUserPartial, APIVerification } from "./types.js";
import { jwtDecode, type JwtPayload } from "jwt-decode";

export function parseUsers(users: APIUser): APIUser;
export function parseUsers(users: APIUser[]): APIUser[];
export function parseUsers(
	users: APIUser | APIUser[],
): APIUser | APIUser[] {
	const process = (user: APIUser) => {
		return {
			...user,
			created_at: new Date(user.created_at),
		};
	};

	if (Array.isArray(users)) {
		return users.map(process);
	}

	return process(users);
}

export function parseVerifications(
  verifications: APIVerification
): APIVerification;
export function parseVerifications(
  verifications: APIVerification[]
): APIVerification[];
export function parseVerifications(
  verifications: APIVerification | APIVerification[]
): APIVerification | APIVerification[] {
  const process = (verification: APIVerification) => {
    return {
      ...verification,
      created_at: new Date(verification.created_at),
      updated_at: verification.updated_at
        ? new Date(verification.updated_at)
        : null,
    };
  };

  if (Array.isArray(verifications)) {
    return verifications.map(process);
  }

  return process(verifications);
}

type DecodedToken = JwtPayload & APIUserPartial & {
  exp: number;
};

export function isTokenExpired(token?: string) {
  if (!token) return true;
  try {
    const decoded: DecodedToken = jwtDecode(token);
    const currentTime = Date.now() / 1000;
    return decoded.exp < currentTime;
  } catch (_e) {
    return true;
  }
};