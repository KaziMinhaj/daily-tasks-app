import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting company-wide database seeding...");

  // Clean existing records in correct relation order
  await prisma.notification.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.taskComment.deleteMany();
  await prisma.taskAssignment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();

  // 1. Seed Office Departments: MIS, Sales and Marketing, Business Operations
  const defaultDepartments = ["MIS", "Sales and Marketing", "Business Operations"];
  for (const dept of defaultDepartments) {
    await prisma.department.create({
      data: { name: dept },
    });
  }
  console.log("✅ Seeded default departments: MIS, Sales and Marketing, Business Operations");

  const hashedPassword = await bcrypt.hash("password123", 10);

  // 2. Seed SuperAdmin Account (Full control of all modules, users & permissions)
  const superadmin = await prisma.user.create({
    data: {
      email: "superadmin@salestracker.com",
      password: hashedPassword,
      name: "সুপার অ্যাডমিন (Super Admin)",
      role: "SUPERADMIN",
      designation: "System Super Administrator",
      department: "MIS",
      phone: "+880 1711-000000",
      canCreateTask: true,
      canCompleteTask: true,
      canAssignTask: true,
      canEditTask: true,
      canDeleteTask: true,
      canViewAllTasks: true,
      canManageUsers: true,
    },
  });

  // 3. Seed Admin (Tanvir Ahmed - MIS Lead)
  const admin = await prisma.user.create({
    data: {
      email: "admin@salestracker.com",
      password: hashedPassword,
      name: "তানভীর আহমেদ (Admin)",
      role: "ADMIN",
      designation: "Head of MIS & Strategy",
      department: "MIS",
      phone: "+880 1711-000001",
      canCreateTask: true,
      canCompleteTask: true,
      canAssignTask: true,
      canEditTask: true,
      canDeleteTask: true,
      canViewAllTasks: true,
      canManageUsers: true,
    },
  });

  // 4. Seed Manager (Kamal Hossain - Sales & Marketing Lead)
  const manager = await prisma.user.create({
    data: {
      email: "manager@salestracker.com",
      password: hashedPassword,
      name: "কামাল হোসেন (Manager)",
      role: "MANAGER",
      designation: "Sales & Marketing Manager",
      department: "Sales and Marketing",
      phone: "+880 1711-000002",
      canCreateTask: true,
      canCompleteTask: true,
      canAssignTask: true,
      canEditTask: true,
      canDeleteTask: true,
      canViewAllTasks: true,
      canManageUsers: false,
    },
  });

  // 5. Seed MIS Staff Member (Has explicit permission to view all office tasks)
  const misAnalyst = await prisma.user.create({
    data: {
      email: "mis@company.com",
      password: hashedPassword,
      name: "সোহেল রানা (MIS Analyst)",
      role: "MEMBER",
      designation: "Senior MIS Analyst & Database Admin",
      department: "MIS",
      phone: "+880 1711-000003",
      canCreateTask: true,
      canCompleteTask: true,
      canAssignTask: true,
      canEditTask: true,
      canDeleteTask: false,
      canViewAllTasks: true, // EXPLICIT PERMISSION TO SEE ALL TASKS
      canManageUsers: false,
    },
  });

  // 6. Seed Operations Staff Member (Only sees tasks assigned to him or created by him)
  const opsOfficer = await prisma.user.create({
    data: {
      email: "ops@company.com",
      password: hashedPassword,
      name: "মাহমুদুল হাসান (Ops Officer)",
      role: "MEMBER",
      designation: "Warehouse & Operations Lead",
      department: "Business Operations",
      phone: "+880 1711-000004",
      canCreateTask: true,
      canCompleteTask: true,
      canAssignTask: false,
      canEditTask: true,
      canDeleteTask: false,
      canViewAllTasks: false, // RESTRICTED: Own / Assigned tasks only!
      canManageUsers: false,
    },
  });

  // 7. Seed Sales Field Staff (RESTRICTED: Cannot create tasks, can complete tasks)
  const salesExec = await prisma.user.create({
    data: {
      email: "sales@company.com",
      password: hashedPassword,
      name: "শাকিল আহমেদ (Sales Exec)",
      role: "MEMBER",
      designation: "Territory Sales Officer",
      department: "Sales and Marketing",
      phone: "+880 1711-000005",
      canCreateTask: false, // RESTRICTED: cannot create tasks!
      canCompleteTask: true, // can complete assigned tasks
      canAssignTask: false,
      canEditTask: false,
      canDeleteTask: false,
      canViewAllTasks: false, // RESTRICTED: Own / Assigned tasks only!
      canManageUsers: false,
    },
  });

  console.log("✅ Seeded SuperAdmin and team across MIS, Sales and Marketing, and Business Operations");

  // 8. Seed Real-world Tasks across MIS, Sales and Marketing, Business Operations
  const tasksData = [
    {
      taskCode: "TSK-001",
      title: "প্রতি শনিবার সকল বইয়ের স্টক নেয়া।",
      description: "কেন্দ্রীয় ডিপো এবং শাখা মজুতের সংখ্যা মিলিয়ে ফিজিক্যাল স্টক অডিট।",
      taskType: "RECURRING",
      recurrenceRule: "WEEKLY:SATURDAY",
      status: "IN_PROGRESS",
      isCompleted: false,
      priority: 8,
      dueDate: null, // চলমান (Ongoing)
      remarks: "স্টক ব্যালেন্স ডাটাবেজে কনফার্ম করতে হবে",
      territory: "সেন্ট্রাল ডিপো",
      department: "Business Operations",
      assignedById: admin.id,
      assignees: [opsOfficer.id],
    },
    {
      taskCode: "TSK-002",
      title: "Agent Transaction statement সংগ্রহ করার লাস্ট তারিখ।",
      description: "সারাদেশের এজেন্টদের লেনদেন ও ব্যাংক ড্রাফট স্টেটমেন্ট রিকনসিলিয়েশন।",
      taskType: "ONE_TIME",
      status: "PENDING",
      isCompleted: false,
      priority: 9,
      dueDate: new Date("2026-10-15T18:00:00.000Z"),
      remarks: "১০ তারিখ মধ্যে সমন্বয় সম্পন্ন করতে হবে",
      territory: "হেড অফিস",
      department: "MIS",
      assignedById: superadmin.id,
      assignees: [misAnalyst.id, admin.id],
    },
    {
      taskCode: "TSK-003",
      title: "HSC মডেল পাঠোর লিস্ট ও ডিলার অর্ডার প্রসেসিং",
      description: "এইচএসসি মডেল টেস্ট বইয়ের অর্ডার বুকিং ও ডিলার ডিস্ট্রিবিউশন লিস্ট ফাইনাল করা।",
      taskType: "ONE_TIME",
      status: "PENDING",
      isCompleted: false,
      priority: 7,
      dueDate: new Date("2026-10-20T18:00:00.000Z"),
      remarks: "ডিলারদের স্পেশাল ডিসকাউন্ট কোড নিশ্চিতকরণ",
      territory: "ঢাকা ও চট্টগ্রাম রিজিওন",
      department: "Sales and Marketing",
      assignedById: manager.id,
      assignees: [salesExec.id],
    },
    {
      taskCode: "TSK-004",
      title: "কুমিল্লা এরিয়া, সাতক্ষীরা টেরিটরি সেলস ও রিকভারি ফলোআপ",
      description: "ফিল্ড অফিসারদের বকেয়া আদায় এবং নতুন বুকস্টল ভিজিট রিপোর্ট তৈরি।",
      taskType: "ONE_TIME",
      status: "IN_PROGRESS",
      isCompleted: false,
      priority: 8,
      dueDate: new Date("2026-10-18T18:00:00.000Z"),
      remarks: "কুমিল্লা এরিয়া, সাতক্ষীরা টেরিটরি বাকি",
      territory: "কুমিল্লা ও সাতক্ষীরা",
      department: "Sales and Marketing",
      assignedById: manager.id,
      assignees: [salesExec.id, manager.id],
    },
    {
      taskCode: "TSK-005",
      title: "সার্ভার ডাটাবেজ ব্যাকআপ ও নাইটলি অটো-সিঙ্ক ভেরিফিকেশন",
      description: "ক্লাউড স্টোরেজে দৈনিক ট্রানজ্যাকশন ডাটাবেজ ব্যাকআপ এবং সিকিউরিটি ইন্টিগ্রিটি টেস্ট।",
      taskType: "RECURRING",
      recurrenceRule: "WEEKLY:SATURDAY",
      status: "DONE",
      isCompleted: true,
      priority: 10,
      dueDate: new Date("2026-10-12T18:00:00.000Z"),
      completedDate: new Date("2026-10-12T09:30:00.000Z"),
      remarks: "ব্যাকআপ সফল ও ভেরিফায়েড",
      territory: "ডাটা সেন্টার",
      department: "MIS",
      assignedById: superadmin.id,
      assignees: [misAnalyst.id],
    },
    {
      taskCode: "TSK-006",
      title: "মাসিক বোর্ড মিটিং প্রেজেন্টেশন ও পারফরম্যান্স রিপোর্ট",
      description: "MIS, Sales & Marketing, এবং Business Operations এর সমন্বিত উৎপাদনশীলতা ও বিক্রয় প্রবৃদ্ধি পর্যালোচনা।",
      taskType: "ONE_TIME",
      status: "PENDING",
      isCompleted: false,
      priority: 10,
      dueDate: new Date("2026-10-25T18:00:00.000Z"),
      remarks: "সকল ডিপার্টমেন্টের কি-পারফরম্যান্স ইন্ডিকেটর (KPI) প্রস্তুত",
      territory: "হেড অফিস কনফারেন্স রুম",
      department: "MIS",
      assignedById: superadmin.id,
      assignees: [admin.id, manager.id],
    },
    {
      taskCode: "TSK-007",
      title: "ডিপো চালান ও জরুরি পণ্য ডেলিভারি ট্র্যাকিং",
      description: "শাখাসমূহের জরুরি রিকুইজিশন অনুসারে পরিবহন বুকিং ও গেটপাস ইস্যু।",
      taskType: "ONGOING",
      status: "IN_PROGRESS",
      isCompleted: false,
      priority: 6,
      dueDate: null, // চলমান
      remarks: "ডিপো চালান বাকি ও কুরিয়ার সমন্বয়",
      territory: "কেন্দ্রীয় ওয়্যারহাউজ",
      department: "Business Operations",
      assignedById: opsOfficer.id,
      assignees: [opsOfficer.id],
    },
    {
      taskCode: "TSK-008",
      title: "অফিস সাপ্লাই ও স্টেশনারি ইনভেন্টরি রিকুইজিশন",
      description: "আগামী কোয়ার্টারের জন্য প্রয়োজনীয় খাতা, রসিদ বই ও প্রিন্টার কার্তুজ অর্ডার।",
      taskType: "ONE_TIME",
      status: "PENDING",
      isCompleted: false,
      priority: 5,
      dueDate: new Date("2026-09-28T18:00:00.000Z"), // Overdue
      remarks: "বাজেট অনুমোদনের অপেক্ষায়",
      territory: "অফিস স্টোর",
      department: "Business Operations",
      assignedById: admin.id,
      assignees: [opsOfficer.id],
    },
  ];

  for (const t of tasksData) {
    const { assignees, ...taskData } = t;
    const createdTask = await prisma.task.create({
      data: {
        ...taskData,
        assignments: {
          create: assignees.map((userId) => ({ userId })),
        },
      },
    });

    await prisma.activityLog.create({
      data: {
        taskId: createdTask.id,
        userId: createdTask.assignedById,
        action: "CREATED",
        details: `Task '${createdTask.title}' created in department '${createdTask.department}'`,
      },
    });

    if (createdTask.isCompleted) {
      await prisma.activityLog.create({
        data: {
          taskId: createdTask.id,
          userId: misAnalyst.id,
          action: "COMPLETED",
          details: "Task verified and completed on time",
        },
      });
    }

    if (createdTask.taskCode === "TSK-002") {
      await prisma.taskComment.create({
        data: {
          taskId: createdTask.id,
          userId: misAnalyst.id,
          comment: "ব্যাংক স্টেটমেন্ট ডাউনলোড সম্পন্ন। এজেন্ট সমন্বয় চলছে।",
        },
      });
    }
  }

  // Seed sample notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: misAnalyst.id,
        title: "জরুরি স্টেটমেন্ট রিমাইন্ডার",
        message: "১৫ তারিখের মধ্যে Agent Transaction statement সংগ্রহ সম্পন্ন করুন।",
        type: "TASK_DUE_SOON",
      },
      {
        userId: opsOfficer.id,
        title: "মেয়াদোত্তীর্ণ টাস্ক",
        message: "'অফিস সাপ্লাই ও স্টেশনারি ইনভেন্টরি' কাজের নির্ধারিত তারিখ পার হয়ে গেছে।",
        type: "TASK_OVERDUE",
      },
      {
        userId: salesExec.id,
        title: "নতুন টাস্ক বরাদ্দ",
        message: "ম্যানেজার আপনাকে 'HSC মডেল পাঠোর লিস্ট' কাজে নিযুক্ত করেছেন।",
        type: "TASK_ASSIGNED",
      },
    ],
  });

  console.log(`✅ Seeded ${tasksData.length} tasks across MIS, Sales and Marketing, and Business Operations`);
  console.log("🚀 Company-wide database seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
