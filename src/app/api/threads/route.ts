import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { Thread } from "@/types";
import { THREAD_RULES } from "@/lib/constants";
import { getSessionUser } from "@/lib/auth/authService";
import { getUserVoteMap } from "@/lib/vote/voteService";
import { findBoard } from "@/lib/categories";

export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(req.url);

    const sort = searchParams.get("sort") || "latest"; // 'latest' | 'top' | 'comments'
    const tag = searchParams.get("tag");
    const category = searchParams.get("category");
    const q = searchParams.get("q");

    let query = `
      SELECT 
        t.*, 
        (SELECT COUNT(*) FROM comments c WHERE c.thread_id = t.id) AS comment_count
      FROM threads t
    `;
    const conditions: string[] = [];
    const args: (string | number)[] = [];

    if (q) {
      conditions.push("(t.title LIKE ? OR t.content LIKE ?)");
      args.push(`%${q}%`, `%${q}%`);
    }

    if (category) {
      const matched = findBoard(category);
      if (matched) {
        conditions.push("(t.category = ? OR t.category = ? OR t.tags LIKE ? OR t.tags LIKE ?)");
        args.push(
          category,
          matched.board.name,
          `%"${matched.board.name}"%`,
          `%"${category}"%`
        );
      } else {
        conditions.push("(t.category = ? OR t.tags LIKE ?)");
        args.push(category, `%"${category}"%`);
      }
    }

    if (tag) {
      conditions.push("t.tags LIKE ?");
      args.push(`%"${tag}"%`);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    if (sort === "top") {
      query += " ORDER BY (t.upvotes - t.downvotes) DESC, t.created_at DESC";
    } else if (sort === "comments") {
      query += " ORDER BY comment_count DESC, t.created_at DESC";
    } else {
      query += " ORDER BY t.created_at DESC";
    }

    query += " LIMIT 50";

    const res = await db.execute({ sql: query, args });

    const sessionUser = await getSessionUser();
    const threadIds = res.rows.map((r) => String(r.id));
    const voteMap = sessionUser
      ? await getUserVoteMap(sessionUser.id, threadIds, "thread")
      : {};

    const threads: Thread[] = res.rows.map((row) => ({
      id: String(row.id),
      user_id: row.user_id ? String(row.user_id) : null,
      title: String(row.title),
      content: String(row.content),
      author_name: String(row.author_name),
      category: String(row.category),
      tags: JSON.parse(String(row.tags || "[]")),
      upvotes: Number(row.upvotes),
      downvotes: Number(row.downvotes),
      views: Number(row.views),
      created_at: Number(row.created_at),
      updated_at: Number(row.updated_at),
      comment_count: Number(row.comment_count || 0),
      user_vote: voteMap[String(row.id)] || 0,
    }));

    return NextResponse.json({ threads });
  } catch (error) {
    console.error("GET /api/threads error:", error);
    return NextResponse.json({ error: "Failed to fetch threads" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = await getDb();
    const body = await req.json();

    const { title, content, author_name, author_pin, category, tags } = body;

    const trimmedTitle = typeof title === "string" ? title.trim() : "";
    const trimmedContent = typeof content === "string" ? content.trim() : "";

    if (!trimmedTitle || !trimmedContent) {
      return NextResponse.json(
        { error: "Title and content are required" },
        { status: 400 }
      );
    }

    if (trimmedTitle.length < THREAD_RULES.MIN_TITLE_LENGTH) {
      return NextResponse.json(
        { error: `หัวข้อกระทู้ต้องมีความยาวอย่างน้อย ${THREAD_RULES.MIN_TITLE_LENGTH} ตัวอักษร` },
        { status: 400 }
      );
    }

    if (trimmedTitle.length > THREAD_RULES.MAX_TITLE_LENGTH) {
      return NextResponse.json(
        { error: `หัวข้อกระทู้ต้องไม่เกิน ${THREAD_RULES.MAX_TITLE_LENGTH} ตัวอักษร` },
        { status: 400 }
      );
    }

    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json(
        { error: "กรุณาเข้าสู่ระบบก่อนตั้งกระทู้ใหม่" },
        { status: 401 }
      );
    }
    const id = "k-" + Date.now().toString(36) + "-" + Math.random().toString(36).substring(2, 6);
    const author = sessionUser.display_name || author_name?.trim() || "สมาชิก";
    const userId = sessionUser.id;
    const cat = category?.trim() || "ทั่วไป";
    const tagArray = Array.isArray(tags) ? tags : [];
    const now = Date.now();

    await db.execute({
      sql: `
        INSERT INTO threads (id, user_id, title, content, author_name, author_pin, category, tags, upvotes, downvotes, views, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?, ?)
      `,
      args: [id, userId, title.trim(), content.trim(), author, author_pin?.trim() || null, cat, JSON.stringify(tagArray), now, now],
    });

    return NextResponse.json({ success: true, id }, { status: 201 });
  } catch (error) {
    console.error("POST /api/threads error:", error);
    return NextResponse.json({ error: "Failed to create thread" }, { status: 500 });
  }
}
