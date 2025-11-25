/* Development seed script for the web app.
 *
 * Usage (after DATABASE_URL is configured):
 *   npm run seed:dev
 */

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  // Create or fetch a Calculus I course
  let course = await prisma.course.findFirst({
    where: { name: "Calculus I" }
  });

  if (!course) {
    course = await prisma.course.create({
      data: {
        name: "Calculus I",
        code: "MATH-101"
      }
    });
  }

  // Seed a few modules under Calculus I
  const moduleTitles = [
    "Calculus I – Limits and Continuity",
    "Calculus I – Derivatives",
    "Calculus I – Applications of Derivatives"
  ];

  const modules = [];
  for (const title of moduleTitles) {
    // Avoid duplicates if seed is re-run
    let module = await prisma.module.findFirst({
      where: { title, courseId: course.id }
    });

    if (!module) {
      module = await prisma.module.create({
        data: {
          title,
          courseId: course.id
        }
      });
    }

    modules.push(module);
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
  const firstModule = modules[0];
  const existingNote = await prisma.note.findFirst({
    where: {
      userId: teacher.id,
      moduleId: firstModule.id
    }
  });

  if (!existingNote) {
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

  console.log("Seed data created (course, modules, teacher, students, note).");
}

main()
  .catch((err) => {
    console.error("Error while seeding database:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

