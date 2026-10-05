// ==============================================================================
// File: .//Description-of-file/thread_view_api.md
// Overview: Dedicated idempotent-separated view count increment endpoint for threads.
// ==============================================================================

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const db = await getDb();

    await db.execute({
      sql: "UPDATE threads SET views = views + 1 WHERE id = ?",
      args: [id],
    });

    const res = await db.execute({
      sql: "SELECT views FROM threads WHERE id = ?",
      args: [id],
    });

    const views = Number(res.rows[0]?.views ?? 0);
    return NextResponse.json({ success: true, views });
  } catch (error) {
    console.error("POST /api/threads/[id]/view error:", error);
    return NextResponse.json({ error: "Failed to increment view" }, { status: 500 });
  }
}
