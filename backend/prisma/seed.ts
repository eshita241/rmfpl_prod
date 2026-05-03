import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const companies = [
  {
    name: "Red Cow",
    skus: [
      { name: "Paneer 200g", weight: 200, mouldCapacity: 120 },
      { name: "Paneer 500g", weight: 500, mouldCapacity: 80 }
    ]
  },
  {
    name: "Modern",
    skus: [
      { name: "Cheese Block 250g", weight: 250, mouldCapacity: 100 },
      { name: "Curd Cup 100g", weight: 100, mouldCapacity: 160 }
    ]
  }
];

async function main() {
  const adminPasswordHash = await bcrypt.hash("admin12345", 12);
  const userPasswordHash = await bcrypt.hash("user12345", 12);

  for (const company of companies) {
    const savedCompany = await prisma.company.upsert({
      where: { name: company.name },
      update: {},
      create: { name: company.name }
    });

    for (const sku of company.skus) {
      await prisma.sKU.upsert({
        where: { name_companyId: { name: sku.name, companyId: savedCompany.id } },
        update: sku,
        create: { ...sku, companyId: savedCompany.id }
      });
    }
  }

  await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: { role: Role.ADMIN, passwordHash: adminPasswordHash },
    create: {
      name: "Local Admin",
      email: "admin@example.com",
      passwordHash: adminPasswordHash,
      role: Role.ADMIN
    }
  });

  await prisma.user.upsert({
    where: { email: "user@example.com" },
    update: { role: Role.USER, passwordHash: userPasswordHash },
    create: {
      name: "Factory User",
      email: "user@example.com",
      passwordHash: userPasswordHash,
      role: Role.USER
    }
  });
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
