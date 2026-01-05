import { z } from "zod";

// Clipper creation schema
export const CreateClipperSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  clipperGroup: z.string().max(100).optional(),
  youtubeChannel: z.string().max(200).optional().nullable(),
  tiktokUsername: z.string().max(100).optional().nullable(),
  instagramUsername: z.string().max(100).optional().nullable(),
});

// Clipper update schema (all fields optional)
export const UpdateClipperSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  clipperGroup: z.string().max(100).optional(),
  youtubeChannel: z.string().max(200).optional().nullable(),
  tiktokUsername: z.string().max(100).optional().nullable(),
  instagramUsername: z.string().max(100).optional().nullable(),
});

// Helper to validate and extract body
export async function validateBody<T>(
  request: Request,
  schema: z.Schema<T>
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      const errors = result.error.issues.map((e) => e.message).join(", ");
      return { success: false, error: errors };
    }

    return { success: true, data: result.data };
  } catch {
    return { success: false, error: "Invalid JSON body" };
  }
}
