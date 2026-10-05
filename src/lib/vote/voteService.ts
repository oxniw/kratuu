// ==============================================================================
// File: .//Description-of-file/vote_service.md
// Overview: Business logic and database operations for recording, toggling, and querying user votes.
// ==============================================================================

import { getDb } from "@/lib/db";

export interface VotePayload {
  userId: string;
  targetId: string;
  targetType: "thread" | "comment";
  voteType: 1 | -1;
}

export interface VoteResult {
  upvotes: number;
  downvotes: number;
  userVote: 1 | -1 | 0;
}

export async function applyVote({
  userId,
  targetId,
  targetType,
  voteType,
}: VotePayload): Promise<VoteResult> {
  const db = await getDb();
  const table = targetType === "comment" ? "comments" : "threads";

  // Check existing vote
  const existingRes = await db.execute({
    sql: `SELECT vote_type FROM votes WHERE user_id = ? AND target_id = ? AND target_type = ?`,
    args: [userId, targetId, targetType],
  });

  const existingVote = existingRes.rows[0]?.vote_type !== undefined
    ? Number(existingRes.rows[0].vote_type)
    : null;

  let nextUserVote: 1 | -1 | 0 = 0;

  if (existingVote === voteType) {
    // Case 1: Toggle off / cancel existing vote
    await db.execute({
      sql: `DELETE FROM votes WHERE user_id = ? AND target_id = ? AND target_type = ?`,
      args: [userId, targetId, targetType],
    });

    const col = voteType === 1 ? "upvotes" : "downvotes";
    await db.execute({
      sql: `UPDATE ${table} SET ${col} = CASE WHEN ${col} > 0 THEN ${col} - 1 ELSE 0 END WHERE id = ?`,
      args: [targetId],
    });

    nextUserVote = 0;
  } else if (existingVote !== null) {
    // Case 2: Switch vote (e.g. from down to up or up to down)
    const now = Date.now();
    await db.execute({
      sql: `UPDATE votes SET vote_type = ?, created_at = ? WHERE user_id = ? AND target_id = ? AND target_type = ?`,
      args: [voteType, now, userId, targetId, targetType],
    });

    if (voteType === 1) {
      // Switched from -1 to 1: upvotes + 1, downvotes - 1
      await db.execute({
        sql: `UPDATE ${table} SET upvotes = upvotes + 1, downvotes = CASE WHEN downvotes > 0 THEN downvotes - 1 ELSE 0 END WHERE id = ?`,
        args: [targetId],
      });
    } else {
      // Switched from 1 to -1: downvotes + 1, upvotes - 1
      await db.execute({
        sql: `UPDATE ${table} SET downvotes = downvotes + 1, upvotes = CASE WHEN upvotes > 0 THEN upvotes - 1 ELSE 0 END WHERE id = ?`,
        args: [targetId],
      });
    }

    nextUserVote = voteType;
  } else {
    // Case 3: First time voting on this target
    const voteId = "v-" + Date.now().toString(36) + "-" + Math.random().toString(36).substring(2, 6);
    const now = Date.now();

    await db.execute({
      sql: `INSERT INTO votes (id, user_id, target_id, target_type, vote_type, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      args: [voteId, userId, targetId, targetType, voteType, now],
    });

    const col = voteType === 1 ? "upvotes" : "downvotes";
    await db.execute({
      sql: `UPDATE ${table} SET ${col} = ${col} + 1 WHERE id = ?`,
      args: [targetId],
    });

    nextUserVote = voteType;
  }

  // Retrieve fresh counters
  const countRes = await db.execute({
    sql: `SELECT upvotes, downvotes FROM ${table} WHERE id = ?`,
    args: [targetId],
  });

  const updated = countRes.rows[0];

  return {
    upvotes: Number(updated?.upvotes || 0),
    downvotes: Number(updated?.downvotes || 0),
    userVote: nextUserVote,
  };
}

export async function getUserVoteMap(
  userId: string | null | undefined,
  targetIds: string[],
  targetType: "thread" | "comment"
): Promise<Record<string, 1 | -1 | 0>> {
  if (!userId || targetIds.length === 0) return {};

  const db = await getDb();
  const placeholders = targetIds.map(() => "?").join(",");

  const res = await db.execute({
    sql: `
      SELECT target_id, vote_type 
      FROM votes 
      WHERE user_id = ? AND target_type = ? AND target_id IN (${placeholders})
    `,
    args: [userId, targetType, ...targetIds],
  });

  const map: Record<string, 1 | -1 | 0> = {};
  for (const row of res.rows) {
    const val = Number(row.vote_type);
    map[String(row.target_id)] = val === 1 || val === -1 ? val : 0;
  }
  return map;
}
