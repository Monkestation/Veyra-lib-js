# Veyra-lib

This is a libary used to interact with the [Veyra API](https://github.com/Monkestation/Veyra), an AIO system for iDenfy verification, designed for SS13 servers.

## Usage

```ts
import { VeyraClient } from "@monkestation/veyra-lib";

const Veyra = new VeyraClient({
  username: "admin",
  password: "password",
});

await Veyra.login();


/// -- Users

// Create a new user with the 'user' role
const newUser = await Veyra.Users.create("username", "password123", "user");

// Create a new user with the 'admin' role
const newAdminUser = await Veyra.Users.create("username", "password123", "admin");

// Delete a user
await Veyra.Users.delete(newAdminUser.id);

/// -- Verifications

// Get verification entry by Discord ID
await Veyra.Verifications.getByDiscord("1291293193913931131");

// Get verification entry by ckey
await Veyra.Verifications.getByCkey("exampleckey492");
```