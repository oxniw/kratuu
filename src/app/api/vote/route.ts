import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/authService";
import { applyVote } from "@/lib/vote/voteService";

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อนโหวต" }, { status: 401 });
    }

    const { target_id, target_type, vote_type } = await req.json(); // vote_type: 1 | -1

    if (!target_id || !target_type || ![1, -1].includes(vote_type)) {
      return NextResponse.json({ error: "Invalid vote payload" }, { status: 400 });
    }

    if (target_type !== "thread" && target_type !== "comment") {
      return NextResponse.json({ error: "Invalid target type" }, { status: 400 });
    }

    const result = await applyVote({
      userId: sessionUser.id,
      targetId: target_id,
      targetType: target_type,
      voteType: vote_type,
    });

    return NextResponse.json({
      success: true,
      upvotes: result.upvotes,
      downvotes: result.downvotes,
      userVote: result.userVote,
    });
  } catch (error) {
    console.error("POST /api/vote error:", error);
    return NextResponse.json({ error: "Failed to record vote" }, { status: 500 });
  }
}
