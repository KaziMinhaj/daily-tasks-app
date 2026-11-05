import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

const JWT_SECRET = process.env.JWT_SECRET || "default-secret-daily-sells-tracker-2026";
const COOKIE_NAME = "sales_auth_token";

export interface TokenPayload {
  id: string;
  email: string;
  role: "SUPERADMIN" | "ADMIN" | "MANAGER" | "MEMBER";
  name: string;
  designation?: string | null;
  department?: string | null;
  canCreateTask?: boolean;
  canCompleteTask?: boolean;
  canAssignTask?: boolean;
  canEditTask?: boolean;
  canDeleteTask?: boolean;
  canViewAllTasks?: boolean;
  canManageUsers?: boolean;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export async function getSessionUser(req?: Request): Promise<TokenPayload | null> {
  let token: string | undefined;

  // 1. Try Authorization header
  if (req) {
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    }
  }

  // 2. Try cookie
  if (!token) {
    try {
      const cookieStore = await cookies();
      const cookie = cookieStore.get(COOKIE_NAME);
      if (cookie) {
        token = cookie.value;
      }
    } catch {
      // In non-server context
    }
  }

  if (!token) return null;

  return verifyToken(token);
}

export { COOKIE_NAME };
