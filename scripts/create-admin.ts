// Secure first-admin setup. There is NO public admin registration on the website.
//
// Usage (run on your own computer with DATABASE_URL pointing at the database):
//   npm run admin:create -- --email you@example.com --name "Your Name"
// You will be asked for a password (min 10 characters). If the account already
// exists (e.g. you registered on the site), it is simply promoted to admin.
import "./load-env";
import readline from "node:readline";

function arg(name: string) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

async function ask(question: string, hidden = false): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  if (hidden) {
    const out = rl as unknown as { _writeToOutput: (s: string) => void; output: NodeJS.WriteStream };
    out._writeToOutput = (s: string) => {
      if (s.includes(question)) out.output.write(s);
      else out.output.write("*");
    };
  }
  return new Promise((resolve) => rl.question(question, (a) => { rl.close(); if (hidden) process.stdout.write("\n"); resolve(a.trim()); }));
}

(async () => {
  const { auth } = await import("../src/lib/auth");
  const { pool, queryOne, query } = await import("../src/lib/db");
  const email = (arg("email") || (await ask("Admin email: "))).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Invalid email address");
  const existing = await queryOne<{ id: string }>('select id from "user" where lower(email)=$1', [email]);
  if (existing) {
    await query(`update "user" set role='admin', "emailVerified"=true where id=$1`, [existing.id]);
    await query("insert into audit_logs (actor_email, action, entity_type, entity_id) values ('cli','user.promoted_to_admin','user',$1)", [existing.id]);
    console.log(`✔ ${email} is now an administrator.`);
  } else {
    const name = arg("name") || (await ask("Your name: "));
    const password = process.env.ADMIN_PASSWORD || (await ask("Choose a password (min 10 characters): ", true));
    if (password.length < 10) throw new Error("Password must be at least 10 characters");
    const res = await auth.api.signUpEmail({ body: { name, email, password } });
    await query(`update "user" set role='admin', "emailVerified"=true where id=$1`, [res.user.id]);
    await query("insert into audit_logs (actor_email, action, entity_type, entity_id) values ('cli','user.admin_created','user',$1)", [res.user.id]);
    console.log(`✔ Administrator account created for ${email}. Log in at /login.`);
  }
  await pool.end();
  process.exit(0);
})().catch((err) => {
  console.error("✖", err instanceof Error ? err.message : err);
  process.exit(1);
});
