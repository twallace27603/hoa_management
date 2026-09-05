import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { ROLES } from '../src/auth/roles.constants';
import 'dotenv/config'
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const INITIAL_ROLES: Array<{ name: string; isGlobal: boolean }> = [
  { name: ROLES.GLOBAL_ADMIN, isGlobal: true },
  { name: ROLES.HOA_PRESIDENT, isGlobal: false },
  { name: ROLES.HOA_BOARD, isGlobal: false },
  { name: ROLES.ARC_CHAIR, isGlobal: false },
  { name: ROLES.MEMBER, isGlobal: false },
  { name: ROLES.PUBLIC, isGlobal: false },
];

async function main() {
  console.log('DATABASE_URL:', process.env.DATABASE_URL)

  for (const role of INITIAL_ROLES) {
    await prisma.role.upsert({ where: { name: role.name }, create: role, update: {} });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
