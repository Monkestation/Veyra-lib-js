import type { User, Verification } from "./types.js";

export async function processUsers(users: User): Promise<User>;
export async function processUsers(users: User[]): Promise<User[]>;
export async function processUsers(
	users: User | User[],
): Promise<User | User[]> {
	const process = (user: User) => {
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

export async function processVerifications(
  verifications: Verification
): Promise<Verification>;
export async function processVerifications(
  verifications: Verification[]
): Promise<Verification[]>;
export async function processVerifications(
  verifications: Verification | Verification[]
): Promise<Verification | Verification[]> {
  const process = (verification: Verification) => {
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