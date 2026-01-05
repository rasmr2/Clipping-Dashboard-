import { NextRequest, NextResponse } from "next/server";
import { verifyPassword, setAuthCookie } from "@/lib/auth";
import { z } from "zod";

const LoginSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const result = LoginSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 }
      );
    }

    const { password } = result.data;

    if (!verifyPassword(password)) {
      // Add slight delay to prevent brute force
      await new Promise((resolve) => setTimeout(resolve, 500));
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    await setAuthCookie();

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
