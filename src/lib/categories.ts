// ==============================================================================
// File: .//Description-of-file/categories.md
// Overview: Grouped category directory and board hierarchy definitions.
// ==============================================================================

export interface BoardItem {
  id: string;
  name: string;
  enName: string;
  slug: string;
}

export interface BoardCategoryGroup {
  groupName: string;
  groupEnName: string;
  boards: BoardItem[];
}

export const BOARD_DIRECTORY: BoardCategoryGroup[] = [
  {
    groupName: "สร้างสรรค์ & ศิลปะ",
    groupEnName: "Creative",
    boards: [
      { id: "artwork", name: "ภาพวาดและงานศิลป์", enName: "Artwork/Critique", slug: "artwork" },
      { id: "photo", name: "การถ่ายภาพ", enName: "Photography", slug: "photography" },
      { id: "food", name: "อาหารและการทำอาหาร", enName: "Food & Cooking", slug: "food" },
      { id: "graphic-3d", name: "กราฟิกและ 3D", enName: "Graphic Design & 3D", slug: "design" },
      { id: "literature", name: "วรรณกรรมและการเขียน", enName: "Literature", slug: "literature" },
      { id: "music", name: "ดนตรีและเพลง", enName: "Music", slug: "music" },
      { id: "fashion", name: "แฟชั่นและสไตล์", enName: "Fashion", slug: "fashion" },
      { id: "diy", name: "งานประดิษฐ์ D.I.Y.", enName: "Do-It-Yourself", slug: "diy" },
      { id: "papercraft", name: "งานพับกระดาษ & หัตถกรรม", enName: "Papercraft & Origami", slug: "papercraft" },
      { id: "wallpapers", name: "วอลเปเปอร์และภาพประกอบ", enName: "Wallpapers/General", slug: "wallpapers" },
    ],
  },
  {
    groupName: "เทคโนโลยี & โค้ด",
    groupEnName: "Technology",
    boards: [
      { id: "tech-general", name: "เทคโนโลยีทั่วไป", enName: "General Technology", slug: "tech" },
      { id: "programming", name: "การเขียนโค้ดและโปรแกรม", enName: "Programming & Dev", slug: "programming" },
      { id: "ai", name: "ปัญญาประดิษฐ์", enName: "Artificial Intelligence", slug: "ai" },
      { id: "gadgets", name: "อุปกรณ์และฮาร์ดแวร์", enName: "Gadgets & Hardware", slug: "gadgets" },
    ],
  },
  {
    groupName: "ชีวิต & สังคม",
    groupEnName: "Life & Society",
    boards: [
      { id: "general", name: "พูดคุยทั่วไป", enName: "General Discussion", slug: "general" },
      { id: "society", name: "ชีวิตและสังคม", enName: "Life & Society", slug: "society" },
      { id: "vent", name: "ปัญหาชีวิต/ระบาย", enName: "Confessions & Venting", slug: "vent" },
      { id: "qa", name: "ถามตอบความรู้", enName: "Q&A & Knowledge", slug: "knowledge" },
    ],
  },
  {
    groupName: "การเงิน & ธุรกิจ",
    groupEnName: "Finance & Business",
    boards: [
      { id: "finance", name: "การเงินและการลงทุน", enName: "Finance & Investment", slug: "finance" },
      { id: "crypto", name: "คริปโตและบล็อกเชน", enName: "Crypto & Blockchain", slug: "crypto" },
      { id: "business", name: "ธุรกิจและสตาร์ทอัพ", enName: "Startups & Business", slug: "business" },
    ],
  },
  {
    groupName: "บันเทิง & บันเทิงคดี",
    groupEnName: "Entertainment",
    boards: [
      { id: "movies", name: "ภาพยนตร์และซีรีส์", enName: "Movies & Series", slug: "movies" },
      { id: "gaming", name: "เกมและอีสปอร์ต", enName: "Gaming & Esports", slug: "gaming" },
      { id: "animation", name: "การ์ตูนและแอนิเมชัน", enName: "Comics & Animation", slug: "animation" },
    ],
  },
];

export function findBoard(query: string): { board: BoardItem; group: BoardCategoryGroup } | null {
  if (!query) return null;
  const q = query.trim().toLowerCase();
  for (const group of BOARD_DIRECTORY) {
    for (const b of group.boards) {
      if (
        b.name.toLowerCase() === q ||
        b.enName.toLowerCase() === q ||
        b.slug.toLowerCase() === q ||
        b.id.toLowerCase() === q
      ) {
        return { board: b, group };
      }
    }
  }
  return null;
}

