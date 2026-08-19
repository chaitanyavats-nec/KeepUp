import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL);
async function run() {
  try {
    const res = await sql`ALTER TABLE habits DROP CONSTRAINT IF EXISTS habits_type_check;`;
    console.log('Dropped constraint', res);
    const res2 = await sql`ALTER TABLE habits ADD CONSTRAINT habits_type_check CHECK (type IN ('boolean', 'numeric', 'protein', 'duration'));`;
    console.log('Added constraint', res2);
  } catch(e) {
    console.error(e);
  }
}
run();
