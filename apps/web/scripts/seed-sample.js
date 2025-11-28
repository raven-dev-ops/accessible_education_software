/**
 * Seed sample students and uploads into the database.
 * Run from apps/web with:  node scripts/seed-sample.js
 * Requires DATABASE_URL to be set (uses Prisma).
 */
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const students = require(path.join(__dirname, "..", "data", "sampleStudents.json"));
const uploads = require(path.join(__dirname, "..", "data", "sampleUploads.json"));

async function seedStudents() {
  for (const s of students) {
    const email = s.email || `student+${s.id}@example.com`;
    await prisma.user.upsert({
      where: { email },
      update: {
        name: s.name || email,
        role: "student",
      },
      create: {
        email,
        name: s.name || email,
        role: "student",
      },
    });
  }
  console.log(`Upserted ${students.length} students.`);
}

async function seedUploads() {
  for (const u of uploads) {
    await prisma.upload.create({
      data: {
        filename: u.filename || null,
        mimetype: u.mimetype || null,
        size: typeof u.size === "number" ? u.size : null,
        status: (u.status || "COMPLETE").toUpperCase(),
      },
    });
  }
  console.log(`Inserted ${uploads.length} uploads.`);
}

async function main() {
  await seedStudents();
  await seedUploads();
}

main()
  .then(() => {
    console.log("Sample data seeding complete.");
  })
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
