import { NextRequest, NextResponse } from "next/server";
import { runScheduledMaintenance } from "@/lib/reminders-service";

export async function GET(req: NextRequest) {
  try {
    // Optional CRON_SECRET verification (Vercel Cron / external scheduler security)
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const authHeader = req.headers.get("authorization");
      const secretParam = req.nextUrl.searchParams.get("secret");
      const isAuthorized =
        authHeader === `Bearer ${cronSecret}` || secretParam === cronSecret;

      if (!isAuthorized) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const report = await runScheduledMaintenance();
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      report,
    });
  } catch (error) {
    console.error("Cron reminders error:", error);
    return NextResponse.json(
      { error: "Failed to run scheduled reminders" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
