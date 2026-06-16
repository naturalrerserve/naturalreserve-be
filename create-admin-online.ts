import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

const connectionString = "postgresql://postgres:lpPACAWodTquiAZDgJWmwEQIwmTcrnTK@shuttle.proxy.rlwy.net:54822/railway";
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminUsername = 'admin';
  const adminEmail = 'admin@naturalreserve.com';
  const plainPassword = 'adminpassword123';

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
