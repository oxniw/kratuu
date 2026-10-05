import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/authService";

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อนแสดงความคิดเห็น" }, { status: 401 });
    }

    const { id } = await props.params;
    const body = await req.json();
    const { content, author_name, author_pin, parent_id } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: "Comment content is required" }, { status: 400 });
    }

    const db = await getDb();
    const commentId = "c-" + Date.now().toString(36) + "-" + Math.random().toString(36).substring(2, 6);
    const author = sessionUser.display_name || author_name?.trim() || "สมาชิก";
    const now = Date.now();

    await db.execute({
      sql: `
        INSERT INTO comments (id, thread_id, parent_id, content, author_name, author_pin, upvotes, downvotes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?)
      `,
      args: [commentId, id, parent_id || null, content.trim(), author, author_pin?.trim() || null, now],
    });

    return NextResponse.json({ success: true, id: commentId }, { status: 201 });
  } catch (error) {
    console.error("POST /api/threads/[id]/comments error:", error);
    return NextResponse.json({ error: "Failed to post comment" }, { status: 500 });
  }
}
