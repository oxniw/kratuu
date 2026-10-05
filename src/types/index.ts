// ==============================================================================
// File: .//Description-of-file/types.md
// Overview: Core domain entity types for threads, comments, and post relationships.
// ==============================================================================

export interface Thread {
  id: string;
  user_id?: string | null;
  title: string;
  content: string;
  author_name: string;
  author_pin?: string;
  category: string;
  tags: string[];
  upvotes: number;
  downvotes: number;
  views: number;
  created_at: number;
  updated_at: number;
  comment_count?: number;
  user_vote?: 1 | -1 | 0;
}

export interface CommentItem {
  id: string;
  user_id?: string | null;
  thread_id: string;
  parent_id?: string | null;
  content: string;
  author_name: string;
  author_pin?: string;
  upvotes: number;
  downvotes: number;
  created_at: number;
  replies?: CommentItem[];
  user_vote?: 1 | -1 | 0;
}
