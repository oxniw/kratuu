// ==============================================================================
// File: .//Description-of-file/db.md
// Overview: Database client connection, schema migrations, and starter seeds.
// ==============================================================================

import { createClient } from "@libsql/client";
import path from "path";

// Initialize local SQLite database file in the project root
const dbPath = path.join(process.cwd(), "kratuu.db");
const client = createClient({
  url: `file:${dbPath}`,
});

let isInitialized = false;

export async function getDb() {
  if (!isInitialized) {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS threads (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        author_name TEXT NOT NULL,
        author_pin TEXT,
        category TEXT NOT NULL DEFAULT 'ทั่วไป',
        tags TEXT NOT NULL DEFAULT '[]',
        upvotes INTEGER NOT NULL DEFAULT 0,
        downvotes INTEGER NOT NULL DEFAULT 0,
        views INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS comments (
        id TEXT PRIMARY KEY,
        thread_id TEXT NOT NULL,
        user_id TEXT,
        parent_id TEXT,
        content TEXT NOT NULL,
        author_name TEXT NOT NULL,
        author_pin TEXT,
        upvotes INTEGER NOT NULL DEFAULT 0,
        downvotes INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
      );
    `);

    // Safe column migrations for existing tables
    try {
      await client.execute("ALTER TABLE threads ADD COLUMN user_id TEXT;");
    } catch {}
    try {
      await client.execute("ALTER TABLE comments ADD COLUMN user_id TEXT;");
    } catch {}
    try {
      await client.execute("ALTER TABLE users ADD COLUMN google_id TEXT;");
    } catch {}
    try {
      await client.execute("ALTER TABLE users ADD COLUMN email TEXT;");
    } catch {}

    await client.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        display_name TEXT NOT NULL,
        email TEXT,
        google_id TEXT,
        password_hash TEXT,
        salt TEXT,
        role TEXT NOT NULL DEFAULT 'user',
        created_at INTEGER NOT NULL
      );
    `);

    await client.execute(`
      CREATE INDEX IF NOT EXISTS idx_users_google ON users(google_id);
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expires_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      );
    `);

    await client.execute(`
      CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
    `);

    await client.execute(`
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    `);

    await client.execute(`
      CREATE INDEX IF NOT EXISTS idx_comments_thread ON comments(thread_id);
    `);

    await client.execute(`
      CREATE INDEX IF NOT EXISTS idx_threads_created ON threads(created_at DESC);
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS votes (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        target_id TEXT NOT NULL,
        target_type TEXT NOT NULL DEFAULT 'thread',
        vote_type INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        UNIQUE(user_id, target_id, target_type)
      );
    `);

    await client.execute(`
      CREATE INDEX IF NOT EXISTS idx_votes_user_target ON votes(user_id, target_id, target_type);
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS email_verifications (
        email TEXT PRIMARY KEY,
        code TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        expires_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      );
    `);

    // Seed sample threads if empty
    const countRes = await client.execute("SELECT COUNT(*) as count FROM threads");
    const count = Number(countRes.rows[0]?.count ?? 0);

    if (count === 0) {
      const now = Date.now();
      const sampleThreads = [
        {
          id: "intro-kratuu-welcome",
          title: "ยินดีต้อนรับสู่ kratuu (กระทู้) - ชุมชนแลกเปลี่ยนความคิดเห็นขาวดำ",
          content: `### ยินดีต้อนรับสู่ kratuu\n\nkratuu คือเว็บบอร์ดที่ออกแบบด้วยแนวคิด **Swiss Minimalist** สองสีขาว-ดำ\n\n#### คุณสมบัติหลัก:\n- **โพสต์ได้ทันที**: ระบุชื่อเล่นและ PIN 4 หลัก ไม่ต้องสมัครสมาชิกให้ยุ่งยาก\n- **รองรับ Markdown**: เขียนโค้ด จัดตัวหนา ตัวเอียง หรือแนบลิงก์ได้เต็มรูปแบบ\n- **ระบบโหวตและแท็ก**: จัดเรียงตามความนิยมหรือล่าสุด\n- **ที่คั่นหน้าส่วนตัว (Bookmarks)**: บันทึกกระทู้ที่สนใจไว้ในเครื่องของคุณ\n\nลองตอบกลับหรือสร้างกระทู้ใหม่ได้เลยที่ปุ่มด้านบน`,
          author_name: "นายกระทู้ (Admin)",
          category: "พูดคุยทั่วไป",
          tags: JSON.stringify(["ยินดีต้อนรับ", "kratuu", "announcement"]),
          upvotes: 24,
          downvotes: 0,
          views: 182,
          created_at: now - 3600000 * 5,
        },
        {
          id: "tech-minimalist-web-design",
          title: "ทำไมเว็บยุคนี้ถึงเริ่มย้อนกลับมาใช้ดีไซน์ขาวดำ Minimalist?",
          content: `หลายปีที่ผ่านมา เว็บไซต์เต็มไปด้วยสีสัน แอนิเมชันหนักๆ และป็อปอัปที่กวนใจ\n\nการกลับมาของสไตล์ **High Contrast Black & White** ช่วยให้ผู้อ่านโฟกัสที่ **เนื้อหาและความคิด** มากกว่าสิ่งรบกวน\n\nทุกคนคิดเห็นอย่างไรกับการออกแบบแนวนี้ในการอ่านบทความยาวๆ ครับ?`,
          author_name: "สมาชิกหมายเลข_9401",
          category: "เทคโนโลยี",
          tags: JSON.stringify(["เทคโนโลยี", "webdesign", "minimalism"]),
          upvotes: 18,
          downvotes: 1,
          views: 95,
          created_at: now - 3600000 * 2,
        },
        {
          id: "pantip-nostalgia-topic",
          title: "คิดถึงเสน่ห์ของเว็บบอร์ดแบบดั้งเดิม vs โซเชียลมีเดียฟีดในปัจจุบัน",
          content: `ใครรู้สึกเหมือนกันบ้างว่าเว็บบอร์ดแบบกระทู้เปิดโอกาสให้คนได้ถกเถียงกันด้วยเหตุผลและข้อมูลมากกว่าอัลกอริทึมของโซเชียลมีเดียที่เน้นแต่ความโกรธและความไว?\n\nกระทู้หนึ่งกระทู้สามารถอยู่ได้เป็นสัปดาห์หรือเป็นเดือนโดยที่ยังมีคนเข้ามาตอบสาระดีๆ อยู่เรื่อยๆ`,
          author_name: "คนชอบอ่าน",
          category: "ชีวิต",
          tags: JSON.stringify(["ความรู้สึก", "pantip", "nostalgia", "ชีวิต"]),
          upvotes: 31,
          downvotes: 0,
          views: 210,
          created_at: now - 3600000 * 1,
        }
      ];

      for (const t of sampleThreads) {
        await client.execute({
          sql: `INSERT INTO threads (id, title, content, author_name, category, tags, upvotes, downvotes, views, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [t.id, t.title, t.content, t.author_name, t.category, t.tags, t.upvotes, t.downvotes, t.views, t.created_at, t.created_at],
        });

        // Add sample comments to intro
        if (t.id === "intro-kratuu-welcome") {
          await client.execute({
            sql: `INSERT INTO comments (id, thread_id, parent_id, content, author_name, upvotes, downvotes, created_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            args: ["c1", t.id, null, "ชอบดีไซน์ขาวดำมากครับ สบายตา โหลดเร็ว ไม่รกตาเลย", "ผู้อ่านนิรนาม", 5, 0, now - 3600000 * 4],
          });
          await client.execute({
            sql: `INSERT INTO comments (id, thread_id, parent_id, content, author_name, upvotes, downvotes, created_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            args: ["c2", t.id, "c1", "เห็นด้วยเลย ตัวหนังสืออ่านง่ายและเน้นสาระจริงๆ ครับ", "โปรแกรมเมอร์หัวใจชิล", 3, 0, now - 3600000 * 3],
          });
        }
      }
    }

    isInitialized = true;
  }
  return client;
}
