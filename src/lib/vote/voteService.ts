// ==============================================================================
// File: .//Description-of-file/vote_service.md
// Overview: Business logic and database operations for recording, toggling, and querying user votes with MongoDB.
// ==============================================================================

import { getDb } from "@/lib/db"; // Import MongoDB database accessor

export interface VotePayload { // Input payload for voting action
  userId: string; // Authenticated user ID
  targetId: string; // ID of thread or comment
  targetType: "thread" | "comment"; // Entity type
  voteType: 1 | -1; // 1 for upvote, -1 for downvote
}

export interface VoteResult { // Returned voting state outcome
  upvotes: number; // Updated upvotes count
  downvotes: number; // Updated downvotes count
  userVote: 1 | -1 | 0; // Current user vote status (0 for retracted)
}

export async function applyVote({ // Applies, switches, or retracts vote in MongoDB
  userId,
  targetId,
  targetType,
  voteType,
}: VotePayload): Promise<VoteResult> {
  const db = await getDb(); // Retrieve MongoDB database instance
  const collectionName = targetType === "comment" ? "comments" : "threads"; // Determine target collection
  const now = Date.now(); // Current timestamp

  // Check existing vote for this user and target
  const existingVote = await db.collection("votes").findOne({ // Find vote document
    user_id: String(userId),
    target_id: String(targetId),
    target_type: targetType,
  }); // End findOne

  let nextUserVote: 1 | -1 | 0 = 0; // Track next vote status

  if (existingVote && existingVote.vote_type === voteType) {
    // Case 1: Toggle off / retract existing vote
    await db.collection("votes").deleteOne({
      user_id: String(userId),
      target_id: String(targetId),
      target_type: targetType,
    });

    const field = voteType === 1 ? "upvotes" : "downvotes";
    await db.collection(collectionName).updateOne(
      { id: String(targetId), [field]: { $gt: 0 } },
      { $inc: { [field]: -1 } }
    );

    nextUserVote = 0;
  } else if (existingVote) {
    // Case 2: Switch vote (e.g. from down to up or up to down)
    await db.collection("votes").updateOne(
      { user_id: String(userId), target_id: String(targetId), target_type: targetType },
      { $set: { vote_type: voteType, created_at: now } }
    );

    if (voteType === 1) {
      // Switched from -1 to 1: upvotes + 1, downvotes - 1
      await db.collection(collectionName).updateOne(
        { id: String(targetId) },
        { $inc: { upvotes: 1 } }
      );
      await db.collection(collectionName).updateOne(
        { id: String(targetId), downvotes: { $gt: 0 } },
        { $inc: { downvotes: -1 } }
      );
    } else {
      // Switched from 1 to -1: downvotes + 1, upvotes - 1
      await db.collection(collectionName).updateOne(
        { id: String(targetId) },
        { $inc: { downvotes: 1 } }
      );
      await db.collection(collectionName).updateOne(
        { id: String(targetId), upvotes: { $gt: 0 } },
        { $inc: { upvotes: -1 } }
      );
    }

    nextUserVote = voteType;
  } else {
    // Case 3: First time voting on this target
    const voteId = "v-" + Date.now().toString(36) + "-" + Math.random().toString(36).substring(2, 6);

    await db.collection("votes").insertOne({
      id: voteId,
      user_id: String(userId),
      target_id: String(targetId),
      target_type: targetType,
      vote_type: voteType,
      created_at: now,
    });

    const field = voteType === 1 ? "upvotes" : "downvotes";
    await db.collection(collectionName).updateOne(
      { id: String(targetId) },
      { $inc: { [field]: 1 } }
    );

    nextUserVote = voteType;
  }

  // Retrieve fresh counters from MongoDB
  const updated = await db.collection(collectionName).findOne({ id: String(targetId) });

  return {
    upvotes: Number(updated?.upvotes || 0),
    downvotes: Number(updated?.downvotes || 0),
    userVote: nextUserVote,
  };
}

export async function getUserVoteMap( // Retrieves mapping of user votes across multiple target IDs
  userId: string | null | undefined,
  targetIds: string[],
  targetType: "thread" | "comment"
): Promise<Record<string, 1 | -1 | 0>> {
  if (!userId || targetIds.length === 0) return {};

  const db = await getDb(); // Access MongoDB
  const cleanTargetIds = targetIds.map(String); // Sanitize primitives

  const votes = await db.collection("votes").find({ // Find matching user votes
    user_id: String(userId),
    target_type: targetType,
    target_id: { $in: cleanTargetIds },
  }).toArray(); // Convert cursor to array

  const map: Record<string, 1 | -1 | 0> = {};
  for (const v of votes) {
    const val = Number(v.vote_type);
    map[String(v.target_id)] = val === 1 || val === -1 ? val : 0;
  }
  return map;
}
