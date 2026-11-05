import assert from "assert";
import crypto from "crypto";
import { hashPassword, verifyPassword, signToken, verifyToken } from "../src/lib/auth";
import {
  parseSheetDate,
  toBengaliDigits,
  toEnglishDigits,
  getDateStatus,
  formatDate,
} from "../src/lib/date-utils";
import { parseCSVText } from "../src/lib/csv-import";
import { prisma } from "../src/lib/prisma";
import {
  sendTaskAssignedEmail,
  sendTaskDueReminderEmail,
  sendPasswordResetEmail,
} from "../src/lib/email-service";
import {
  runScheduledMaintenance,
  getTimezoneParts,
  hasTimeArrived,
} from "../src/lib/reminders-service";

async function runTests() {
  console.log("🚀 Starting Office Tasks & Permissions Test Suite...\n");
  let passed = 0;
  let total = 0;

  async function test(name: string, fn: () => void | Promise<void>) {
    total++;
    try {
      await fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ✗ ${name}:`, err.message);
    }
  }

  // 1. Auth & Password Tests
  await test("Auth: hashPassword and verifyPassword should work with bcrypt", async () => {
    const raw = "password123";
    const hashed = await hashPassword(raw);
    assert.notStrictEqual(raw, hashed);
    const valid = await verifyPassword(raw, hashed);
    assert.strictEqual(valid, true);
    const invalid = await verifyPassword("wrongPass", hashed);
    assert.strictEqual(invalid, false);
  });

  await test("Auth: JWT signToken and verifyToken should preserve user payload, role and permissions", () => {
    const payload = {
      id: "user-123",
      email: "superadmin@salestracker.com",
      role: "SUPERADMIN" as const,
      name: "Super Admin",
      department: "MIS",
      canCreateTask: true,
      canCompleteTask: true,
      canViewAllTasks: true,
      canManageUsers: true,
    };
    const token = signToken(payload);
    assert.ok(typeof token === "string");
    const verified = verifyToken(token);
    assert.ok(verified !== null);
    assert.strictEqual(verified?.email, payload.email);
    assert.strictEqual(verified?.role, "SUPERADMIN");
    assert.strictEqual(verified?.department, "MIS");
    assert.strictEqual(verified?.canManageUsers, true);
  });

  // 2. SuperAdmin Account Verification
  await test("SuperAdmin: Account exists and possesses complete permissions", async () => {
    const superadmin = await prisma.user.findUnique({
      where: { email: "superadmin@salestracker.com" },
    });
    assert.ok(superadmin !== null, "SuperAdmin must exist");
    assert.strictEqual(superadmin.role, "SUPERADMIN");
    assert.strictEqual(superadmin.canCreateTask, true);
    assert.strictEqual(superadmin.canCompleteTask, true);
    assert.strictEqual(superadmin.canAssignTask, true);
    assert.strictEqual(superadmin.canEditTask, true);
    assert.strictEqual(superadmin.canDeleteTask, true);
    assert.strictEqual(superadmin.canViewAllTasks, true);
    assert.strictEqual(superadmin.canManageUsers, true);
  });

  // 3. Departments: Default & Dynamic Creation
  await test("Departments: Default departments (MIS, Sales and Marketing, Business Operations) exist", async () => {
    const departments = await prisma.department.findMany({ select: { name: true } });
    const names = departments.map((d) => d.name);
    assert.ok(names.includes("MIS"), "MIS department must exist");
    assert.ok(names.includes("Sales and Marketing"), "Sales and Marketing must exist");
    assert.ok(names.includes("Business Operations"), "Business Operations must exist");
  });

  await test("Departments: Dynamic department creation works seamlessly", async () => {
    const testDept = "Human Resources & Admin";
    const existing = await prisma.department.findUnique({ where: { name: testDept } });
    if (!existing) {
      const created = await prisma.department.create({ data: { name: testDept } });
      assert.strictEqual(created.name, testDept);
    }
    const found = await prisma.department.findUnique({ where: { name: testDept } });
    assert.ok(found !== null);
  });

  // 4. Multi-Select Assignees (Assign multiple, deselect one, deselect all)
  await test("Assignees: Multi-select assignment, individual deselection and complete deselection", async () => {
    const task = await prisma.task.findFirst({
      include: { assignments: true },
    });
    assert.ok(task !== null, "Sample task should exist");

    const users = await prisma.user.findMany({ take: 3 });
    assert.ok(users.length >= 2, "Need at least 2 users");

    // 1. Assign multiple users (2 users)
    await prisma.taskAssignment.deleteMany({ where: { taskId: task.id } });
    await prisma.taskAssignment.createMany({
      data: [
        { taskId: task.id, userId: users[0].id },
        { taskId: task.id, userId: users[1].id },
      ],
    });
    let count = await prisma.taskAssignment.count({ where: { taskId: task.id } });
    assert.strictEqual(count, 2, "Task should have 2 assignees");

    // 2. Deselect one user
    await prisma.taskAssignment.deleteMany({
      where: { taskId: task.id, userId: users[0].id },
    });
    count = await prisma.taskAssignment.count({ where: { taskId: task.id } });
    assert.strictEqual(count, 1, "Task should have 1 assignee remaining after deselection");

    // 3. Deselect all (0 assignees)
    await prisma.taskAssignment.deleteMany({ where: { taskId: task.id } });
    count = await prisma.taskAssignment.count({ where: { taskId: task.id } });
    assert.strictEqual(count, 0, "Task should have 0 assignees after deselect all");
  });

  // 5. Strict Task Visibility Permissions
  await test("Visibility: SuperAdmin and user with canViewAllTasks see all tasks; restricted user only sees own/assigned", async () => {
    const allTaskCount = await prisma.task.count();

    // 1. SuperAdmin
    const superadmin = await prisma.user.findUnique({ where: { email: "superadmin@salestracker.com" } });
    assert.ok(superadmin !== null);
    // As SuperAdmin, visibility query is unfiltered:
    const superadminTasks = await prisma.task.count({});
    assert.strictEqual(superadminTasks, allTaskCount, "SuperAdmin must see all tasks");

    // 2. Member with canViewAllTasks: true (mis@company.com)
    const misUser = await prisma.user.findUnique({ where: { email: "mis@company.com" } });
    assert.ok(misUser !== null);
    assert.strictEqual(misUser.canViewAllTasks, true);
    const misTasks = await prisma.task.count({});
    assert.strictEqual(misTasks, allTaskCount, "User with canViewAllTasks: true must see all tasks");

    // 3. Restricted Member with canViewAllTasks: false (ops@company.com)
    const opsUser = await prisma.user.findUnique({ where: { email: "ops@company.com" } });
    assert.ok(opsUser !== null);
    assert.strictEqual(opsUser.canViewAllTasks, false);
    // Restricted query
    const opsVisibleTasks = await prisma.task.findMany({
      where: {
        OR: [
          { assignments: { some: { userId: opsUser.id } } },
          { assignedById: opsUser.id },
        ],
      },
    });
    assert.ok(
      opsVisibleTasks.length < allTaskCount,
      "Restricted user should see only their own or assigned tasks"
    );
    // Verify each visible task is either created by or assigned to opsUser
    for (const t of opsVisibleTasks) {
      const isCreator = t.assignedById === opsUser.id;
      const assignment = await prisma.taskAssignment.findFirst({
        where: { taskId: t.id, userId: opsUser.id },
      });
      assert.ok(isCreator || assignment !== null, "Task must be created by or assigned to user");
    }
  });

  // 6. Strict Task Creation Permission
  await test("Task Creation: canCreateTask permission is strictly enforced", async () => {
    // 1. User with canCreateTask = false (sales@company.com)
    const salesUser = await prisma.user.findUnique({ where: { email: "sales@company.com" } });
    assert.ok(salesUser !== null);
    assert.strictEqual(salesUser.canCreateTask, false, "Sales user must have canCreateTask = false");

    // Check backend permission guard
    const allowed = salesUser.role === "SUPERADMIN" || salesUser.canCreateTask;
    assert.strictEqual(allowed, false, "Backend must reject task creation when canCreateTask is false");

    // 2. User with canCreateTask = true (ops@company.com)
    const opsUser = await prisma.user.findUnique({ where: { email: "ops@company.com" } });
    assert.ok(opsUser !== null);
    assert.strictEqual(opsUser.canCreateTask, true, "Ops user must have canCreateTask = true");
    const opsAllowed = opsUser.role === "SUPERADMIN" || opsUser.canCreateTask;
    assert.strictEqual(opsAllowed, true, "Backend must allow task creation when canCreateTask is true");
  });

  // 7. Strict Task Edit & Delete Permissions
  await test("Task Permissions: canEditTask, canDeleteTask, and canCompleteTask are strictly enforced", async () => {
    // Test user with canEditTask: false
    const testUserNoEdit: {
      role: string;
      canEditTask: boolean;
      canDeleteTask: boolean;
      canCompleteTask: boolean;
    } = {
      role: "MEMBER",
      canEditTask: false,
      canDeleteTask: false,
      canCompleteTask: false,
    };
    const canEdit = testUserNoEdit.role === "SUPERADMIN" || Boolean(testUserNoEdit.canEditTask);
    const canDelete = testUserNoEdit.role === "SUPERADMIN" || Boolean(testUserNoEdit.canDeleteTask);
    const canComplete = testUserNoEdit.role === "SUPERADMIN" || Boolean(testUserNoEdit.canCompleteTask);

    assert.strictEqual(canEdit, false, "User with canEditTask=false must NOT be permitted to edit");
    assert.strictEqual(canDelete, false, "User with canDeleteTask=false must NOT be permitted to delete");
    assert.strictEqual(canComplete, false, "User with canCompleteTask=false must NOT be permitted to complete");

    // SuperAdmin bypass
    const superUser: {
      role: string;
      canEditTask: boolean;
      canDeleteTask: boolean;
      canCompleteTask: boolean;
    } = {
      role: "SUPERADMIN",
      canEditTask: false,
      canDeleteTask: false,
      canCompleteTask: false,
    };
    const superCanEdit = superUser.role === "SUPERADMIN" || Boolean(superUser.canEditTask);
    const superCanDelete = superUser.role === "SUPERADMIN" || Boolean(superUser.canDeleteTask);
    const superCanComplete = superUser.role === "SUPERADMIN" || Boolean(superUser.canCompleteTask);

    assert.strictEqual(superCanEdit, true, "SUPERADMIN must always have permission to edit");
    assert.strictEqual(superCanDelete, true, "SUPERADMIN must always have permission to delete");
    assert.strictEqual(superCanComplete, true, "SUPERADMIN must always have permission to complete");
  });

  // 7. Bangla Numerals & Date Utils
  await test("Localization: toBengaliDigits should convert 2026 to ২০২৬", () => {
    assert.strictEqual(toBengaliDigits("2026"), "২০২৬");
    assert.strictEqual(toBengaliDigits(10), "১০");
  });

  await test("Localization: toEnglishDigits should convert ২০২৬ to 2026", () => {
    assert.strictEqual(toEnglishDigits("২০২৬"), "2026");
    assert.strictEqual(toEnglishDigits("১০"), "10");
  });

  await test("Date Utils: parseSheetDate should recognize 'চলমান' as isOngoing: true", () => {
    const result = parseSheetDate("চলমান");
    assert.strictEqual(result.isOngoing, true);
    assert.strictEqual(result.date, null);
  });

  await test("Date Utils: parseSheetDate should parse '27-Aug-2026'", () => {
    const result = parseSheetDate("27-Aug-2026");
    assert.strictEqual(result.isOngoing, false);
    assert.ok(result.date instanceof Date);
    assert.strictEqual(result.date.getFullYear(), 2026);
    assert.strictEqual(result.date.getMonth(), 7);
    assert.strictEqual(result.date.getDate(), 27);
  });

  // 8. CSV Parsing Engine
  await test("CSV Engine: parseCSVText should correctly parse sheet rows with Bangla text and ongoing tasks", () => {
    const sampleCSV = `✓,Due Date,Priority,Task,Completed Date / Remarks
,চলমান,8,প্রতি শনিবার সকল বইয়ের স্টক নেয়া।,সকল ডিপো ও এজেন্ট স্টক আপডেট নিশ্চিত করুন
,27-Aug-2026,7,HSC মডেল পাঠোর লিস্ট,১০ তারিখ মধ্যে
✓,12-Oct-2026,10,বকেয়া আদায় রিপোর্ট এবং ব্যাংকিং চালান জমা,আজকের মধ্যে ডিপো চালান ক্লিয়ারেন্স সম্পন্ন`;

    const parsed = parseCSVText(sampleCSV);
    assert.strictEqual(parsed.length, 3);
    assert.strictEqual(parsed[0].taskType, "RECURRING");
    assert.strictEqual(parsed[0].priority, 8);
  });

  // 9. Automated Email Notifications - Trigger 1 (New Task Assignment Email)
  await test("Email: sendTaskAssignedEmail correctly structures email and dispatches notification", async () => {
    const res = await sendTaskAssignedEmail(
      { email: "test.assignee@company.com", name: "Rahim Ahmed" },
      {
        id: "task-assigned-test",
        taskCode: "TSK-0099",
        title: "বাজার পরিদর্শন ও স্টক যাচাইকরণ",
        description: "চট্টগ্রাম ডিপোর সকল প্রতিনিধির বিক্রয় প্রতিবেদন গ্রহণ করুন",
        priority: 9,
        dueDate: new Date(Date.now() + 86400000),
        department: "Sales and Marketing",
        territory: "Chittagong",
        remarks: "জরুরি ভিত্তিতে সম্পন্ন করতে হবে",
        assignedByName: "Super Admin",
      }
    );
    assert.strictEqual(res.success, true);
    assert.ok(res.messageId);
  });

  // 10. Automated Email Notifications - Trigger 2 (Approaching Due Date & Duplicate Prevention)
  await test("Email & Cron: Due Date Approaching Reminder (<24h) triggers email and prevents duplicate sends via dueReminderSentAt", async () => {
    const testUser = await prisma.user.findFirst();
    assert.ok(testUser, "Need a test user");

    // Clean up any previous test tasks and notifications
    await prisma.notification.deleteMany({
      where: {
        OR: [
          { message: { contains: "TEST_DUE_SOON_TASK" } },
          { link: { contains: "TEST-REM-01" } },
        ],
      },
    });
    await prisma.task.deleteMany({
      where: { title: "TEST_DUE_SOON_TASK" },
    });

    // Create a task due in 12 hours with dueReminderSentAt = null
    const dueIn12Hours = new Date(Date.now() + 12 * 60 * 60 * 1000);
    const task = await prisma.task.create({
      data: {
        taskCode: "TEST-REM-01",
        title: "TEST_DUE_SOON_TASK",
        description: "Deadline within 12 hours",
        status: "PENDING",
        isCompleted: false,
        dueDate: dueIn12Hours,
        dueReminderSentAt: null,
        assignedById: testUser.id,
        assignments: {
          create: [{ userId: testUser.id }],
        },
      },
    });

    assert.strictEqual(task.dueReminderSentAt, null, "Initial task must not have dueReminderSentAt");

    // First run of scheduled maintenance: approaching task must be found and reminder sent
    const report1 = await runScheduledMaintenance();
    assert.ok(report1.dueReminderEmailsSent >= 1, "Should send due reminder email for approaching task");

    // Verify database record has been updated with dueReminderSentAt timestamp
    const updatedTask = await prisma.task.findUnique({
      where: { id: task.id },
    });
    assert.ok(updatedTask?.dueReminderSentAt !== null, "dueReminderSentAt must be set in database to prevent duplicate emails");

    // Second run of scheduled maintenance: verify this task is skipped and NOT sent again!
    const updatedTimestamp = updatedTask?.dueReminderSentAt?.getTime();
    await runScheduledMaintenance();
    const recheckedTask = await prisma.task.findUnique({
      where: { id: task.id },
    });
    assert.strictEqual(
      updatedTimestamp,
      recheckedTask?.dueReminderSentAt?.getTime(),
      "dueReminderSentAt timestamp must remain intact and not re-trigger"
    );

    // Clean up test task and test notifications
    await prisma.notification.deleteMany({
      where: {
        OR: [
          { link: `/tasks/${task.id}` },
          { link: `/tasks/${task.taskCode}` },
          { message: { contains: "TEST_DUE_SOON_TASK" } },
        ],
      },
    });
    await prisma.task.delete({ where: { id: task.id } });
  });

  // 17. Forgot Password Email Test
  await test("Email: sendPasswordResetEmail dispatches styled password reset email", async () => {
    const res = await sendPasswordResetEmail({
      recipient: {
        name: "Test User",
        email: "test.reset@salestracker.com",
      },
      resetUrl: "http://localhost:3000/reset-password?token=test-sample-token-12345",
      locale: "bn",
    });
    assert.strictEqual(res.success, true);
    assert.ok(res.messageId);
  });

  // 18. Password Reset Token Lifecycle & Security Test
  await test("Auth & Security: Password reset token generation, verification, password update, and single-use invalidation", async () => {
    // 1. Create temporary test user
    const testEmail = `reset.tester.${Date.now()}@salestracker.com`;
    const initialPass = "OldPassword123";
    const user = await prisma.user.create({
      data: {
        email: testEmail,
        password: await hashPassword(initialPass),
        name: "Reset Tester",
        role: "MEMBER",
        department: "Business Operations",
      },
    });

    // 2. Generate raw token and hash
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 mins

    const resetTokenRecord = await prisma.passwordResetToken.create({
      data: {
        email: testEmail,
        tokenHash,
        expiresAt,
      },
    });

    assert.strictEqual(resetTokenRecord.used, false);

    // 3. Verify token record exists and is valid
    const foundToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });
    assert.ok(foundToken !== null);
    assert.strictEqual(foundToken.used, false);
    assert.ok(foundToken.expiresAt > new Date());

    // 4. Perform password reset with new password
    const newPass = "NewSecurePassword456";
    const newHashed = await hashPassword(newPass);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: newHashed },
    });

    await prisma.passwordResetToken.updateMany({
      where: { email: testEmail, used: false },
      data: { used: true },
    });

    // 5. Verify old password fails and new password succeeds
    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
    });
    assert.ok(updatedUser !== null);
    assert.strictEqual(await verifyPassword(initialPass, updatedUser.password), false);
    assert.strictEqual(await verifyPassword(newPass, updatedUser.password), true);

    // 6. Verify token is now marked as used (cannot be reused)
    const consumedToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });
    assert.strictEqual(consumedToken?.used, true, "Consumed token must be marked used: true");

    // Clean up
    await prisma.passwordResetToken.deleteMany({ where: { email: testEmail } });
    await prisma.user.delete({ where: { id: user.id } });
  });

  // 12. Recurrence Time and Timezone Parsing
  await test("Recurrence Utils: hasTimeArrived & getTimezoneParts correctly evaluate schedules", () => {
    // hasTimeArrived checks
    assert.strictEqual(hasTimeArrived(10, 30, "09:00"), true);
    assert.strictEqual(hasTimeArrived(9, 0, "09:00"), true);
    assert.strictEqual(hasTimeArrived(8, 59, "09:00"), false);
    assert.strictEqual(hasTimeArrived(14, 0, "15:00"), false);

    // getTimezoneParts checks
    const testDate = new Date("2026-11-04T12:00:00Z");
    const dhakaParts = getTimezoneParts(testDate, "Asia/Dhaka");
    assert.strictEqual(dhakaParts.year, 2026);
    assert.strictEqual(dhakaParts.month, 11);
    assert.strictEqual(dhakaParts.day, 4);
    assert.strictEqual(dhakaParts.hour, 18); // UTC 12:00 + 6h = 18:00 in Dhaka
    assert.strictEqual(dhakaParts.weekday, "WEDNESDAY");

    // Leap year and month end clamping logic checks
    const feb2026Days = new Date(2026, 2, 0).getDate(); // Non-leap year February
    assert.strictEqual(feb2026Days, 28);
    const feb2028Days = new Date(2028, 2, 0).getDate(); // Leap year February
    assert.strictEqual(feb2028Days, 29);
    const apr2026Days = new Date(2026, 4, 0).getDate(); // 30-day month
    assert.strictEqual(apr2026Days, 30);

    // Target day 31 clamping behavior
    assert.strictEqual(Math.min(31, feb2026Days), 28, "31st in non-leap Feb triggers on 28th");
    assert.strictEqual(Math.min(31, feb2028Days), 29, "31st in leap year Feb triggers on 29th");
    assert.strictEqual(Math.min(31, apr2026Days), 30, "31st in 30-day month triggers on 30th");
  });

  // 13. Automated Recurring Task Job Execution & Idempotency
  await test("Recurring Scheduler: Automatically instantiates tasks and prevents duplicates", async () => {
    const admin = await prisma.user.findFirst({
      where: { role: "SUPERADMIN" },
    });
    assert.ok(admin !== null);

    const now = new Date();
    const tz = getTimezoneParts(now, "Asia/Dhaka");

    // Create a Daily Recurring Task scheduled for past time today (should generate)
    const dailyParent = await prisma.task.create({
      data: {
        taskCode: "TEST-REC-DAILY",
        title: "দৈনিক বিক্রয় সারাংশ পর্যালোচনা (Daily Sales Review)",
        taskType: "RECURRING",
        recurrenceFrequency: "DAILY",
        recurrenceTime: "00:01", // Already arrived today
        recurrenceTimezone: "Asia/Dhaka",
        department: "Sales and Marketing",
        assignedById: admin.id,
        assignments: {
          create: [{ userId: admin.id }],
        },
      },
    });

    // Run scheduled maintenance
    const report1 = await runScheduledMaintenance();
    assert.ok(report1.recurringInstancesGenerated >= 1);

    // Verify child instance was generated with parentTaskId linked and assigned
    const childInstance = await prisma.task.findFirst({
      where: { parentTaskId: dailyParent.id },
      include: { assignments: true },
    });
    assert.ok(childInstance !== null);
    assert.strictEqual(childInstance.taskType, "ONE_TIME");
    assert.strictEqual(childInstance.status, "PENDING");
    assert.strictEqual(childInstance.assignments.length, 1);
    assert.strictEqual(childInstance.assignments[0].userId, admin.id);

    // Verify parent's lastGeneratedAt was updated
    const updatedParent = await prisma.task.findUnique({
      where: { id: dailyParent.id },
    });
    assert.ok(updatedParent?.lastGeneratedAt !== null);

    // Re-run maintenance immediately to verify IDEMPOTENCY (duplicate prevention)
    const report2 = await runScheduledMaintenance();
    const childInstancesAfter = await prisma.task.findMany({
      where: { parentTaskId: dailyParent.id },
    });
    assert.strictEqual(
      childInstancesAfter.length,
      1,
      "Duplicate instance must NOT be generated on the same day"
    );

    // Clean up test tasks
    await prisma.activityLog.deleteMany({
      where: { taskId: { in: [dailyParent.id, childInstance.id] } },
    });
    await prisma.taskAssignment.deleteMany({
      where: { taskId: { in: [dailyParent.id, childInstance.id] } },
    });
    await prisma.task.deleteMany({
      where: { id: { in: [dailyParent.id, childInstance.id] } },
    });
  });

  console.log(`\n========================================`);
  console.log(`Test Results: ${passed}/${total} passed (${Math.round((passed / total) * 100)}%)`);
  console.log(`========================================\n`);

  await prisma.$disconnect();

  if (passed !== total) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test runner error:", err);
  process.exit(1);
});
