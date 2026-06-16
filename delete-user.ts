import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = "postgresql://postgres:lpPACAWodTquiAZDgJWmwEQIwmTcrnTK@shuttle.proxy.rlwy.net:54822/railway";
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const usernameToDelete = 'allen';

  // 1. Delete associated AccessRequest (if exists)
  await prisma.accessRequest.deleteMany({
    where: { username: usernameToDelete }
  });

  // 2. Delete User
  const deletedUser = await prisma.user.deleteMany({
    where: { username: usernameToDelete }
  });

  if (deletedUser.count > 0) {
    console.log(`Sukses menghapus akun dengan username: ${usernameToDelete} dari database online!`);
  } else {
    console.log(`Akun dengan username ${usernameToDelete} tidak ditemukan.`);
  }
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
