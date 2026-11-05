import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token || token.length < 10) {
      return NextResponse.json({ valid: false, error: "Token is required" }, { status: 400 });
    }

    const tokenHash = crypto.createHash("sha256").update(token.trim()).digest("hex");

    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!record) {
      return NextResponse.json(
        { valid: false, error: "Invalid or nonexistent reset token" },
        { status: 400 }
      );
    }

    if (record.used) {
      return NextResponse.json(
        { valid: false, error: "This reset link has already been used" },
        { status: 400 }
      );
    }

    if (new Date() > record.expiresAt) {
      return NextResponse.json(
        { valid: false, error: "This reset link has expired" },
        { status: 400 }
      );
    }

    // Mask email for display: e.g. "m***@gmail.com"
    const [namePart, domain] = record.email.split("@");
    const maskedName =
      namePart.length > 2
        ? namePart[0] + "***" + namePart[namePart.length - 1]
        : namePart[0] + "***";
    const maskedEmail = `${maskedName}@${domain}`;

    return NextResponse.json({
      valid: true,
      email: maskedEmail,
    });
  } catch (error: any) {
    console.error("GET /api/auth/verify-reset-token error:", error);
    return NextResponse.json({ valid: false, error: "Failed to verify token" }, { status: 500 });
  }
}
