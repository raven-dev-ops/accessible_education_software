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
const modulesData = require(path.join(__dirname, "..", "data", "sampleModules.json"));

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

async function seedCoursesModulesSubmodules() {
  const courseNames = ["Calculus I", "Calculus II", "Linear Algebra", "Physics", "Statistics"];
  const courses = {};
  for (const name of courseNames) {
    courses[name] = await prisma.course.upsert({
      where: { name },
      update: {},
      create: { name, code: name.replace(/\s+/g, "-").toUpperCase() },
    });
  }

  // Simple submodule/equation samples per module
  const submodules = {
    calc1: [
      { title: "Limits basics", equation: "lim_{h->0} (f(x+h)-f(x))/h" },
      { title: "Power rule", equation: "f(x)=x^2 => f'(x)=2x" },
      { title: "Trig identities", equation: "sin^2 x + cos^2 x = 1" },
    ],
    calc2: [
      { title: "Integration by parts", equation: "∫u dv = uv - ∫v du" },
      { title: "Series convergence", equation: "Σ (1/n^2) converges (p-series p=2)" },
      { title: "Taylor series", equation: "e^x = Σ x^n / n!" },
    ],
    linear: [
      { title: "Solve Ax=b", equation: "Row-reduce [A|b]" },
      { title: "Eigenvalues", equation: "det(A-λI)=0" },
      { title: "Determinant", equation: "det([[a,b],[c,d]]) = ad-bc" },
    ],
    physics: [
      { title: "Kinematics", equation: "s = v0 t + 1/2 a t^2" },
      { title: "Dynamics", equation: "F = m a" },
      { title: "Energy", equation: "KE = 1/2 m v^2; PE = mgh" },
    ],
    statistics: [
      { title: "Conditional prob.", equation: "P(A|B)=P(A∩B)/P(B)" },
      { title: "Normal", equation: "N(μ, σ^2) pdf" },
      { title: "CLT", equation: "x̄ ~ Normal(μ, σ/√n) for large n" },
    ],
  };

  for (const m of modulesData) {
    const course = courses[m.course] || courses["Calculus I"];
    const module = await prisma.module.upsert({
      where: { id: String(m.id) },
      update: {
        title: m.title,
        courseId: course.id,
        teacherProgress: m.teacherProgress ?? 0,
        studentCompletion: m.studentCompletion ?? 0,
        submodulesCompleted: m.submodulesCompleted ?? 0,
        submodulesTotal: m.submodulesTotal ?? 0,
        ticketsOpen: m.ticketsOpen ?? 0,
        ticketsResolved: m.ticketsResolved ?? 0,
        sampleEquation: m.sampleEquation ?? null,
      },
      create: {
        id: String(m.id),
        title: m.title,
        courseId: course.id,
        teacherProgress: m.teacherProgress ?? 0,
        studentCompletion: m.studentCompletion ?? 0,
        submodulesCompleted: m.submodulesCompleted ?? 0,
        submodulesTotal: m.submodulesTotal ?? 0,
        ticketsOpen: m.ticketsOpen ?? 0,
        ticketsResolved: m.ticketsResolved ?? 0,
        sampleEquation: m.sampleEquation ?? null,
      },
    });

    const subs = submodules[module.id] || submodules[(m.course || "").toLowerCase()] || [];
    for (let i = 0; i < subs.length; i++) {
      const s = subs[i];
      await prisma.submodule.upsert({
        where: { id: `${module.id}-sub-${i}` },
        update: {
          title: s.title,
          equation: s.equation,
          order: i,
          moduleId: module.id,
        },
        create: {
          id: `${module.id}-sub-${i}`,
          title: s.title,
          equation: s.equation,
          order: i,
          moduleId: module.id,
        },
      });
    }
  }

  console.log(`Upserted ${modulesData.length} modules with submodules.`);
}

async function main() {
  await seedStudents();
  await seedUploads();
  await seedCoursesModulesSubmodules();
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
