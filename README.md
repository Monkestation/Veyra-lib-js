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

```

## Examples

```ts
/// -- Users

// Create a new user with the 'user' role
const newUser = await Veyra.Users.create("username1", "password123", "user");

// Create a new user with the 'admin' role
const newAdminUser = await Veyra.Users.create("username2", "password123", "admin");

// Delete a user
await newAdminUser.delete();

// Change role of a user.
await newAdminUser.updateRole("user");

/// -- Verifications

// Get verification entry by Discord ID
const verification = await Veyra.Verifications.getByDiscord("1291293193913931131");

// Update a verification entry
verification.update({
  verified_by: newAdminUser.username,
  verification_method: "manual"
});

// Get verification entry by ckey
const verificationByCkey = await Veyra.Verifications.getByCkey("exampleckey492");
```