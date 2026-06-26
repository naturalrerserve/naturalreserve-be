import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

// SECURITY: JANGAN hardcode credentials di sini!
// Gunakan: DATABASE_URL=... npx ts-node create-admin-online.ts
import 'dotenv/config';
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('[SECURITY] DATABASE_URL tidak diset!');
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminUsername = 'admin';
  const adminEmail = 'admin@naturalreserve.com';
  // SECURITY: Password diambil dari env var, BUKAN hardcode di sini
  const plainPassword = process.env.ADMIN_PASSWORD;
  if (!plainPassword) throw new Error('[SECURITY] Set env var ADMIN_PASSWORD terlebih dahulu!');

  const existingAdmin = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
  });

  if (existingAdmin) {
    console.log(`Admin sudah ada di database online dengan username: ${existingAdmin.username}`);
    return;
  }

  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  const admin = await prisma.user.create({
    data: {
      username: adminUsername,
      email: adminEmail,
      firstName: 'Super',
      lastName: 'Admin',
      password: hashedPassword,
      role: 'ADMIN',
    },
  });

  console.log('🎉 Sukses membuat akun Admin di DATABASE ONLINE!');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
