import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// SECURITY: JANGAN hardcode credentials di sini!
import 'dotenv/config';
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('[SECURITY] DATABASE_URL tidak diset!');
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const users = await prisma.user.findMany();
  console.log('All Users:', JSON.stringify(users, null, 2));
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
