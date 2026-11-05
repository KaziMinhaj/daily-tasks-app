import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email-service";
import crypto from "crypto";
import { z } from "zod";

const forgotPasswordSchema = z.object({
  email: z.string().email(),
  locale: z.enum(["en", "bn"]).optional().default("bn"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = forgotPasswordSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Please provide a valid email address" },
        { status: 400 }
      );
    }

    const { email, locale } = result.data;
    const normalizedEmail = email.trim().toLowerCase();

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Rate-limiting check: Debounce requests within 60 seconds
    const recentToken = await prisma.passwordResetToken.findFirst({
      where: {
        email: normalizedEmail,
        createdAt: {
          gte: new Date(Date.now() - 60 * 1000), // last 60 seconds
        },
      },
    });

    if (recentToken) {
      // Return 200 with generic message so timing attacks or enumeration cannot distinguish
      return NextResponse.json({
        success: true,
        message:
          "If an account with that email exists, a password reset link has been sent. Please check your inbox.",
      });
    }

    if (user && user.isActive) {
      // Generate cryptographically secure random token (32 bytes = 64 hex characters)
      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes expiry

      // Save token hash to database
      await prisma.passwordResetToken.create({
        data: {
          email: normalizedEmail,
          tokenHash,
          expiresAt,
        },
      });

      // Compute base URL for reset link
      const host =
        req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
      const protocol =
        req.headers.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
      const baseUrl = `${protocol}://${host}`;
      const resetUrl = `${baseUrl}/reset-password?token=${rawToken}`;

      // Dispatch password reset email
      try {
        await sendPasswordResetEmail({
          recipient: {
            name: user.name,
            email: user.email,
          },
          resetUrl,
          locale,
        });
      } catch (emailErr) {
        console.error("❌ Failed to send password reset email:", emailErr);
      }
    }

    // Always return generic success response to prevent email enumeration (OWASP standard)
    return NextResponse.json({
      success: true,
      message:
        "If an account with that email exists, a password reset link has been sent. Please check your inbox.",
    });
  } catch (error: any) {
    console.error("POST /api/auth/forgot-password error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
