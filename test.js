import { expect } from "chai";
import { exec, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  UserInstance,
  VerificationInstance,
  VeyraClient,
} from "./dist/index.cjs";

const Veyra = new VeyraClient({
	username: "admin",
	password: "admin123",
	baseUrl: "http://127.0.0.1:3000",
});

/**
 * @type {import("child_process").ChildProcessWithoutNullStreams}
 */
let veyraServerProcess;

// Utility function to introduce a delay
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

describe("Veyra Client Tests", function () {
	this.timeout(15000); // Set a higher timeout for initial setup

	before(async () => {
		if (!process.env.NO_VEYRA) {
			console.log("Setting up Veyra server...");
      const veyraDir = path.join(process.cwd(), "Veyra");

      // Check if Veyra is already cloned
      if (!fs.existsSync(veyraDir)) {
        console.log("Cloning Veyra repository...");
        await new Promise((resolve, reject) => {
          exec(
            "git clone https://github.com/Monkestation/Veyra.git Veyra",
            (error, stdout, stderr) => {
              if (error) {
                console.error(`Git clone failed: ${error.message}`);
                return reject(error);
              }
              console.log(`stdout: ${stdout}`);
              console.error(`stderr: ${stderr}`);
              resolve();
            }
          );
        });
        await delay(5000);
      }

      // pull the latest changes
      console.log("Pulling latest changes for Veyra repository...");
      await new Promise((resolve, reject) => {
        exec("git pull", { cwd: veyraDir }, (error, stdout, stderr) => {
          if (error) {
            console.error(`Git pull failed: ${error.message}`);
            return reject(error);
          }
          console.log(`stdout: ${stdout}`);
          console.error(`stderr: ${stderr}`);
          resolve();
        });
      });

      console.log("Resetting Veyra repository to a clean state...");
      await new Promise((resolve, reject) => {
        exec("git reset --hard", { cwd: veyraDir }, (error, stdout, stderr) => {
          if (error) {
            console.error(`Git reset failed: ${error.message}`);
            return reject(error);
          }
          console.log(`stdout: ${stdout}`);
          console.error(`stderr: ${stderr}`);
          resolve();
        });
      });

      // Remove any existing .db files
      const files = fs.readdirSync(veyraDir);
      for (const file of files) {
        if (file.endsWith(".db")) {
          fs.unlinkSync(path.join(veyraDir, file));
          console.log(`Deleted existing database file: ${file}`);
        }
      }

      // Wait a moment to ensure filesystem operations complete
      await delay(1000);

      // Install dependencies for Veyra server
      console.log("Installing Veyra dependencies...");
      await new Promise((resolve, reject) => {
        exec("npm install", { cwd: veyraDir }, (error, stdout, stderr) => {
          if (error) {
            console.error(`npm install failed: ${error.message}`);
            return reject(error);
          }
          console.log(`stdout: ${stdout}`);
          console.error(`stderr: ${stderr}`);
          resolve();
        });
      });

      // Start the Veyra server
      console.log("Starting Veyra server...");
      veyraServerProcess = spawn("npm", ["run", "dev"], { cwd: veyraDir });

      veyraServerProcess.stdout.on("data", (data) => {
        console.log(`Veyra stdout: ${data}`);
      });

      veyraServerProcess.stderr.on("data", (data) => {
        console.error(`Veyra stderr: ${data}`);
      });

      veyraServerProcess.on("error", (error) => {
        console.error(`Failed to start Veyra server: ${error}`);
      });
		}

		// Wait for the server to be ready
		await delay(1500);

		// Log in once before all tests
		await Veyra.login();
	});

	after(async () => {
		console.log("Stopping Veyra server...");
		if (veyraServerProcess) {
			veyraServerProcess.kill();
		}
	});

	// --- Verifications Tests ---
	describe("Verifications", () => {
		/**
		 * @type {VerificationInstance}
		 */
		let ver;

		beforeEach(async () => {
			// Create a fresh verification for each test
			ver = await Veyra.Verifications.createOrUpdate({
				discord_id: "123123",
				ckey: "meowmeow",
				verification_method: "api",
			});
		});

		afterEach(async () => {
			// Clean up the verification after each test
			if (ver && !ver.deleted) {
				await ver.delete();
			}
		});

		it("should be able to create a new verification", async () => {
			expect(ver.discordId).to.equal("123123");
			expect(ver.ckey).to.equal("meowmeow");
			expect(ver.verificationMethod).to.equal("api");
			expect(ver.data.created_at).to.not.be.null;
			expect(ver.data.updated_at).to.not.be.null;
			expect(ver.verifiedFlags).to.deep.equal({});
		});

		it("should be able to get a verification by discord ID", async () => {
			const fetchedVer = await Veyra.Verifications.getByDiscord("123123");
			expect(fetchedVer.discordId).to.equal("123123");
			expect(fetchedVer.ckey).to.equal("meowmeow");
			expect(fetchedVer.data.id).to.equal(ver.data.id);
		});

		it("should be able to get a verification by ckey", async () => {
			const fetchedVer = await Veyra.Verifications.getByCkey("meowmeow");
			expect(fetchedVer.ckey).to.equal("meowmeow");
			expect(fetchedVer.discordId).to.equal("123123");
			expect(fetchedVer.data.id).to.equal(ver.data.id);
		});

		it("should update and merge verified flags correctly", async () => {
			// Update with a single flag
			await ver.update({
				verified_flags: {
					flag1: true,
				},
			});
			expect(ver.verifiedFlags).to.deep.equal({ flag1: true });
			expect(ver.hasBeenUpdated()).to.be.true;

			await ver.update({
				verified_flags: {
					flag1: false,
					flag2: "test",
				},
			});
			expect(ver.verifiedFlags).to.deep.equal({ flag1: false, flag2: "test" });

			// Update with a third flag, ensuring the first two are preserved
			await ver.update({
				verified_flags: {
					flag3: "persisted",
				},
			});
			expect(ver.verifiedFlags).to.deep.equal({
				flag1: false,
				flag2: "test",
				flag3: "persisted",
			});
		});

		it("should be able to update a verification's method", async () => {
			await ver.update({
				verification_method: "manual",
			});
			expect(ver.verificationMethod).to.equal("manual");
		});

		it("should be able to update a verification's ckey", async () => {
			await ver.update({
				ckey: "newckey",
			});
			expect(ver.ckey).to.equal("newckey");
			const fetchedVer = await Veyra.Verifications.getByDiscord(ver.discordId);
			expect(fetchedVer.ckey).to.equal("newckey");
		});

		it("should be not able to update a verification's verified_by", async () => {
			// it may return a 400, containing "No valid fields to update" in the message

			// await ver.update({
			//   verified_by: "meow!"
			// });
			try {
				await ver.update({
					verified_by: "meow!",
				});
			} catch (e) {
				expect(e.cause.body.error).to.include("No valid fields to update");
			}
			// Should remain unchanged
			expect(ver.verifiedBy).to.equal("admin");
		});

		it("should be able to get a list of all verifications", async () => {
			const result = await Veyra.Verifications.getAll();
			expect(result.verifications).to.be.an("array");
			expect(result.verifications.length).to.be.greaterThan(0);
		});

		it("should be able to get a list of verifications with search filters", async () => {
			const searchVer = await Veyra.Verifications.createOrUpdate({
				discord_id: "999999",
				ckey: "searchtest",
				verification_method: "api",
			});

			const result = await Veyra.Verifications.getAll(1, 50, "searchtest");
			expect(result.verifications).to.have.lengthOf(1);
			expect(result.verifications[0].ckey).to.equal("searchtest");
			expect(result.verifications[0].discordId).to.equal("999999");
			await searchVer.delete();
		});

		it("should be able to get verifications in bulk by discord ID", async () => {
			const anotherVer = await Veyra.Verifications.createOrUpdate({
				discord_id: "456456",
				ckey: "bulktest",
			});
			const verifications = await Veyra.Verifications.bulkByDiscord([
				"123123",
				"456456",
			]);
			expect(verifications).to.have.lengthOf(2);
			expect(verifications.some((v) => v.discordId === "123123")).to.be.true;
			expect(verifications.some((v) => v.discordId === "456456")).to.be.true;
			await anotherVer.delete();
		});

		it("should be able to get verifications in bulk by ckey", async () => {
			const anotherVer = await Veyra.Verifications.createOrUpdate({
				discord_id: "789789",
				ckey: "bulktest2",
			});
			const verifications = await Veyra.Verifications.bulkByCkey([
				"meowmeow",
				"bulktest2",
			]);
			expect(verifications).to.have.lengthOf(2);
			expect(verifications.some((v) => v.ckey === "meowmeow")).to.be.true;
			expect(verifications.some((v) => v.ckey === "bulktest2")).to.be.true;
			await anotherVer.delete();
		});

		it("should be able to delete a verification", async () => {
			await ver.delete();
			ver.deleted = true; // Mark as deleted to skip cleanup

			// Check if it's truly deleted
			let deletedVer = null;
			try {
				deletedVer = await Veyra.Verifications.getByDiscord("123123");
			} catch (e) {
				expect(e.message).to.include("404");
			}
			expect(deletedVer).to.be.null;
		});

		it("should not be able to update a deleted verification", async () => {
			await ver.delete();
			ver.deleted = true;
			try {
				await ver.update({
					verified_flags: {
						verified: false,
					},
				});
			} catch (e) {
				expect(e.message).to.include("404");
			}
		});
	});

	// --- Users Tests ---
	describe("Users", () => {
		let user;

		afterEach(async () => {
			// Clean up the user after each test
			if (user && !user.deleted) {
				await user.delete();
			}
		});

		it("should be able to create a new user", async () => {
			user = await Veyra.Users.create("testuser", "testpassword", "user");
			expect(user.username).to.equal("testuser");
			expect(user.isAdmin).to.be.false;
			expect(user.data.created_at).to.not.be.null;
		});

		it("should be able to get a user by ID", async () => {
			user = await Veyra.Users.create("testuser", "testpassword", "user");
			const fetchedUser = await Veyra.Users.get(user.id);
			expect(fetchedUser.username).to.equal("testuser");
		});

		it("should be able to get a user by username", async () => {
			user = await Veyra.Users.create("testuser", "testpassword", "user");
			const fetchedUser = await Veyra.Users.get("testuser");
			expect(fetchedUser.id).to.equal(user.id);
		});

		it("should be able to get all users", async () => {
			user = await Veyra.Users.create("testuser", "testpassword", "user");
			const allUsers = await Veyra.Users.getAll();
			expect(allUsers).to.be.an("array");
			expect(allUsers.length).to.be.greaterThan(0);
			expect(allUsers.some((u) => u.username === "testuser")).to.be.true;
		});

		it("should be able to update a user's role", async () => {
			user = await Veyra.Users.create("testuser", "testpassword", "user");
			expect(user.isAdmin).to.be.false;
			await user.updateRole("admin");
			expect(user.isAdmin).to.be.true;
		});

		it("should be able to delete a user", async () => {
			user = await Veyra.Users.create("testuser", "testpassword", "user");
			await user.delete();

			let deletedUser = null;
			try {
				deletedUser = await Veyra.Users.get(user.id);
			} catch (e) {

				expect(e.code).to.be("UserNotFound");
			}

      expect(deletedUser).to.be.undefined;
		});
	});

	// --- Analytics Tests ---
	describe("Analytics", () => {
		it("should be able to get analytics data", async () => {
			const analytics = await Veyra.Analytics.get();
			expect(analytics).to.be.an("object");
			expect(analytics.total_verifications).to.be.a("number");
			expect(analytics.total_users).to.be.a("number");
			expect(analytics.verification_methods).to.be.an("array");
		});
	});

	// --- Activity Logs Tests ---
	describe("ActivityLogs", () => {
		let logs;
		it("should be able to get activity logs", async () => {
			logs = await Veyra.Activity.get();
			expect(logs).to.be.an("object");
			expect(logs.activities).to.be.an("array");
			expect(logs.page).to.be.a("number");
			expect(logs.limit).to.be.a("number");
			expect(logs.activities.length).to.be.greaterThan(0);
		});

		it("should have a valid first log", async () => {
			expect(logs.activities[0].user.username).to.equal("admin");
			expect(logs.activities[0].user).to.be.instanceOf(UserInstance);
		});
	});
});
