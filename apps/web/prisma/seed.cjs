/* Development seed script for the web app.
 *
 * Usage (after DATABASE_URL is configured):
 *   npm run seed:dev
 */

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const modulesData = [
    { id: "calc1", title: "Calculus I - Limits & Derivatives", course: "Calculus I", code: "MATH-101", sampleEquation: "f(x)=x^2, f'(x)=2x; limit h->0 (f(x+h)-f(x))/h" },
    { id: "calc2", title: "Calculus II - Integrals & Series", course: "Calculus II", code: "MATH-102", sampleEquation: "integral x^2 dx = x^3/3 + C; sum (1/n^2) converges" },
    { id: "linear", title: "Linear Algebra - Vectors & Matrices", course: "Linear Algebra", code: "MATH-201", sampleEquation: "det(A-?I)=0; Ax=b" },
    { id: "physics", title: "Physics - Kinematics & Forces", course: "Physics", code: "PHYS-101", sampleEquation: "F=ma; s=v0 t + 0.5 a t^2" },
    { id: "statistics", title: "Statistics - Probability & Distributions", course: "Statistics", code: "STAT-101", sampleEquation: "P(A|B)=P(AnB)/P(B); Normal(µ,s^2)" },
  ];

  const submodules = {
    calc1: [
      { title: "Limits basics", equation: "lim_{h->0} (f(x+h)-f(x))/h" },
      { title: "Power rule", equation: "f(x)=x^2 => f'(x)=2x" },
      { title: "Trig identities", equation: "sin^2 x + cos^2 x = 1" },
    ],
    calc2: [
      { title: "Integration by parts", equation: "?u dv = uv - ?v du" },
      { title: "Series convergence", equation: "S (1/n^2) converges (p-series p=2)" },
      { title: "Taylor series", equation: "e^x = S x^n / n!" },
    ],
    linear: [
      { title: "Solve Ax=b", equation: "Row-reduce [A|b]" },
      { title: "Eigenvalues", equation: "det(A-?I)=0" },
      { title: "Determinant", equation: "det([[a,b],[c,d]]) = ad-bc" },
    ],
    physics: [
      { title: "Kinematics", equation: "s = v0 t + 1/2 a t^2" },
      { title: "Dynamics", equation: "F = m a" },
      { title: "Energy", equation: "KE = 1/2 m v^2; PE = mgh" },
    ],
    statistics: [
      { title: "Conditional probability", equation: "P(A|B)=P(AnB)/P(B)" },
      { title: "Normal distribution", equation: "N(µ, s^2) pdf" },
      { title: "CLT", equation: "x¯ ~ Normal(µ, s/vn) for large n" },
    ],
  };

  const courseCache = {};
  for (const m of modulesData) {
    const course = (courseCache[m.course] = courseCache[m.course] || (await prisma.course.upsert({
      where: { name: m.course },
      update: { code: m.code },
      create: { name: m.course, code: m.code },
    })));

    await prisma.module.upsert({
      where: { id: m.id },
      update: {
        title: m.title,
        courseId: course.id,
        teacherProgress: 0,
        studentCompletion: 0,
        submodulesCompleted: 0,
        submodulesTotal: submodules[m.id]?.length ?? 0,
        ticketsOpen: 0,
        ticketsResolved: 0,
        sampleEquation: m.sampleEquation ?? null,
      },
      create: {
        id: m.id,
        title: m.title,
        courseId: course.id,
        teacherProgress: 0,
        studentCompletion: 0,
        submodulesCompleted: 0,
        submodulesTotal: submodules[m.id]?.length ?? 0,
        ticketsOpen: 0,
        ticketsResolved: 0,
        sampleEquation: m.sampleEquation ?? null,
      },
    });

    const mod = await prisma.module.findUnique({ where: { id: m.id } });
    const subs = submodules[m.id] || [];
    for (let i = 0; i < subs.length; i++) {
      const s = subs[i];
      await prisma.submodule.upsert({
        where: { id: `${m.id}-sub-${i}` },
        update: {
          title: s.title,
          equation: s.equation,
          order: i,
          moduleId: mod.id,
        },
        create: {
          id: `${m.id}-sub-${i}`,
          title: s.title,
          equation: s.equation,
          order: i,
          moduleId: mod.id,
        },
      });
    }
  }

  // Seed a teacher user
  const teacherEmail = "teacher@example.com";
  const teacher = await prisma.user.upsert({
    where: { email: teacherEmail },
    update: { role: "teacher" },
    create: {
      email: teacherEmail,
      name: "Sample Teacher",
      role: "teacher"
    }
  });

  // Seed some student users
  const studentEmails = [
    "student.alice@example.com",
    "student.bob@example.com",
    "student.chen@example.com"
  ];

  for (const email of studentEmails) {
    await prisma.user.upsert({
      where: { email },
      update: { role: "student" },
      create: {
        email,
        name: email.split("@")[0],
        role: "student"
      }
    });
  }

  // Seed one sample note for the first module
  const firstModule = await prisma.module.findFirst({ where: { id: modulesData[0].id } });
  const existingNote = await prisma.note.findFirst({
    where: {
      userId: teacher.id,
      moduleId: firstModule?.id
    }
  });

  if (!existingNote && firstModule) {
    await prisma.note.create({
      data: {
        userId: teacher.id,
        moduleId: firstModule.id,
        text:
          "Lecture 1: Limits and Continuity.\n" +
          "We introduce the concept of a limit, notation, and examples with piecewise functions."
      }
    });
  }

  console.log("Seed data created (courses, modules with submodules, teacher, students, note).");
}

main()
  .catch((err) => {
    console.error("Error while seeding database:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
