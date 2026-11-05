# Daily Sells & Activities Tracker | দৈনিক বিক্রয় ও কার্যক্রম

A complete, production-ready full-stack web application designed to replace the Google Sheet **"Daily Sells & Activities"**, built specifically for sales and publication field distribution teams (Admin, Managers, RSI, ASM, TSO, and Agents).

---

## 🌟 Key Highlights & Google Sheet Parity

| Google Sheet Column | App Implementation |
|---|---|
| **✓ (Checkbox)** | One-click optimistic checkbox marking task as Done / Pending with timestamping |
| **Due Date** | Robust parser supporting `27-Aug-2026`, Bangla dates (`৩/৯/২৬`), and **"চলমান"** (Ongoing / Recurring badge) |
| **Priority** | 1–10 star rating (`⭐`), free-text priority notes, and quick sorting |
| **Task** | Full Unicode support with **Noto Sans Bengali** for mixed Bangla and English descriptions |
| **Completed Date / Remarks** | Preserves remarks (e.g., *"১০ তারিখ মধ্যে"*, *"কুমিল্লা এরিয়া, সাতক্ষীরা টেরিটরি বাকি"*), tracks completed date |
| **Sales Roles** | Role-based visibility for **Admin**, **Manager**, and Field Staff (**RSI**, **ASM**, **TSO**, **Agent Coordinator**) |

---

## 🚀 Features

1. **Multiple Interactive Views:**
   - **Sheet Table View:** Exact Google Sheet aesthetic with classic `#38761d` green headers, inline quick add, and overdue highlighting in red.
   - **Kanban Board:** 3 lanes (*Pending*, *In Progress*, *Done*) with fast stage transitions.
   - **Calendar View:** Monthly grid with pinned top shelf for ongoing (*চলমান*) tasks without fixed deadlines.
   - **Executive Dashboard:** Live stats, completion rates, 7-day completion trends, and officer-level performance.
2. **Localization & Language Toggle:**
   - Real-time switch between **English** and **বাংলা**.
   - Handles Bangla digits (০–৯) and Asia/Dhaka (+06:00) timezone calculations.
3. **Google Sheet Import & Export:**
   - **Import:** Upload CSV or paste raw table text; automatically parses "চলমান", priorities, and remarks with a pre-import preview.
   - **Export:** Instant CSV download with UTF-8 BOM encoding so Bangla characters render natively in Microsoft Excel and Google Sheets without distortion.
4. **Task Audit Trail & Comments:**
   - Threaded discussion on each task.
   - Full history log tracking who created, updated, or marked tasks done.
5. **Background Automation & Reminders:**
   - Automated recurrence generator for recurring tasks (e.g. weekly on Saturday - *প্রতি শনিবার*).
   - In-app notification center and endpoint for automated email alerts for due-tomorrow and overdue tasks.

---

## 🛠️ Tech Stack

- **Framework:** Next.js (App Router) + TypeScript
- **Styling:** Tailwind CSS + Noto Sans Bengali typography
- **Icons:** Lucide React
- **Database ORM:** Prisma ORM (SQLite zero-config local, PostgreSQL for Docker/Production)
- **Auth:** JWT session with bcrypt password hashing and HTTP-only cookies
- **Charts:** Recharts
- **Parsing:** PapaParse with custom Bangla numeral & date normalization

---

## ⚡ Quick Start (Run Locally in 2 Minutes)

### 1. Prerequisites
- Node.js 18+ installed

### 2. Install & Setup Database
```bash
# Clone or navigate to the directory
cd daily-sells-tracker

# Install dependencies (already completed in scratch workspace)
npm install

# Initialize database schema
npx prisma db push

# Seed sample data (creates realistic tasks and accounts)
npm run seed
```

### 3. Run Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🔑 Demo Accounts (Pre-seeded)

All accounts use the password: `password123`

| Name | Role | Designation | Email |
|---|---|---|---|
| তানভীর আহমেদ | `ADMIN` | Head of Operations | `admin@salestracker.com` |
| কামাল হোসেন | `MANAGER` | National Sales Manager | `manager@salestracker.com` |
| রহিম উদ্দিন | `MEMBER` | RSI (Regional Sales Incharge) | `rsi@salestracker.com` |
| করিম মিয়া | `MEMBER` | ASM (Area Sales Manager) | `asm@salestracker.com` |
| শাকিল আহমেদ | `MEMBER` | TSO (Territory Sales Officer) | `tso@salestracker.com` |
| মোহাম্মদ আলী | `MEMBER` | Agent Coordinator | `agent@salestracker.com` |

*(The login screen also features 1-click autofill buttons for each account).*

---

## 🧪 Running Automated Tests

Run the built-in unit and integration test suite:
```bash
npm test
```
Verifies:
- Password hashing & verification
- JWT token signing & payload verification
- Bangla numeral conversion (`২০২৬` ↔ `2026`)
- Date parsing of Google Sheet expressions and `"চলমান"`
- CSV parsing and column mapper
- Database connectivity and seed validity

---

## 📡 API Endpoints

### Authentication
- `POST /api/auth/login` - Authenticate with email/password and set cookie
- `POST /api/auth/logout` - Clear session cookie
- `GET /api/auth/me` - Get current session and profile

### Tasks
- `GET /api/tasks` - List tasks with query filters (`status`, `assigneeId`, `priority`, `taskType`, `search`, `overdueOnly`, `sortBy`)
- `POST /api/tasks` - Create task with assignees, activity log, and notifications
- `GET /api/tasks/[id]` - Retrieve task with comments, activity logs, and assignments
- `PATCH /api/tasks/[id]` - Update task fields, assignments, status
- `DELETE /api/tasks/[id]` - Delete task (Admin/Manager/Owner)
- `PATCH /api/tasks/[id]/toggle` - High-performance one-click status checkbox toggle
- `POST /api/tasks/[id]/comments` - Add comment and notify assignees

### Analytics & Reports
- `GET /api/dashboard/stats` - Summary KPI metrics, status distributions, 7-day trend, and member performance
- `GET /api/tasks/export` - Export tasks to CSV with UTF-8 BOM or JSON format
- `POST /api/tasks/import` - Upload or paste CSV from Google Sheet

### Team & Notifications
- `GET /api/users` - List team members
- `POST /api/users` - Create new team member (Admin/Manager only)
- `GET /api/notifications` - Get user notifications
- `PATCH /api/notifications` - Mark all notifications as read

### Background Cron
- `GET /api/cron/reminders` - Trigger automated check for due-tomorrow tasks, overdue alerts, and recurring task generation

---

## 🐳 Docker & Production Deployment

### Option A: Docker Compose (with PostgreSQL)
```bash
# 1. Update prisma/schema.prisma datasource provider to "postgresql"
# 2. Run with Docker Compose:
docker compose up -d --build
```
The app runs on port `3000` connected to PostgreSQL on port `5432`.

### Option B: Deploy to Vercel / Render / Railway
1. Set Environment Variables in dashboard:
   - `DATABASE_URL`: PostgreSQL connection string (e.g. Supabase, Neon, or Railway Postgres)
   - `JWT_SECRET`: Random 32+ character string
   - `NEXT_PUBLIC_APP_URL`: Your production domain
2. Build command: `npx prisma db push && npm run build`
3. Start command: `npm start`
