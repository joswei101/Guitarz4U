// Prints the SQL that Better Auth needs for an EMPTY database (used to create
// db/migrations/001_auth.sql). Not needed for normal setup.
import { getMigrations } from "better-auth/db/migration";
import { auth } from "../src/lib/auth";

(async () => {
  const { compileMigrations } = await getMigrations(auth.options);
  console.log(await compileMigrations());
  process.exit(0);
})();
