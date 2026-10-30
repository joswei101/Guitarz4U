// Runs the database tests. Requires the local Supabase stack (npx supabase start).
import { spawnSync } from 'node:child_process';
const r = spawnSync(process.execPath, ['--test', '--test-concurrency=1', 'tests/db/security.test.mjs'], { stdio: 'inherit' });
process.exit(r.status ?? 1);
