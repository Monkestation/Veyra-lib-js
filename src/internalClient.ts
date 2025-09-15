import type { VeyraClient } from "./client.js";
import type { User } from "./types.js";

export async function resolveUser(
	client: VeyraClient,
	userResolvable: number | string | User,
) {
	const users = await client.Users.getAll();
	if (typeof userResolvable === "number") {
    return users.find((e) => e.id === userResolvable);
	} else if (typeof userResolvable === "string" ) {
		return users.find((e) => e.username === userResolvable);
  } else {
		return users.find((e) => e.username === userResolvable.username);
	}
}
