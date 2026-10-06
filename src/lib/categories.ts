// ==============================================================================
// File: .//Description-of-file/categories.md
// Overview: Grouped category directory, board definitions, and lookup helpers.
// ==============================================================================

export interface BoardItem { // Defines individual board data contract
  id: string; // Unique identifier for board
  name: string; // Thai descriptive name
  enName: string; // English standard name
  slug: string; // URL short code or slug
  isSpecial?: boolean; // Flag for special boards like main Board feed
} // End BoardItem interface

export interface BoardCategoryGroup { // Defines grouped category column contract
  groupName: string; // Thai group title
  groupEnName: string; // English group title
  badge?: string; // Optional tag or badge (e.g. NSFW, NEW)
  boards: BoardItem[]; // List of boards under this category
} // End BoardCategoryGroup interface

export const BOARD_DIRECTORY: BoardCategoryGroup[] = [ // Full hierarchical board directory registry
  { // Japanese Culture column
    groupName: "วัฒนธรรมญี่ปุ่น", // Thai group title
    groupEnName: "Japanese Culture", // English group title
    boards: [ // Boards list
      { id: "anime-manga", name: "อนิเมะและมังงะ", enName: "Anime & Manga", slug: "a" }, // Anime board
      { id: "anime-cute", name: "อนิเมะแนวน่ารัก", enName: "Anime/Cute", slug: "c" }, // Cute anime board
      { id: "anime-wallpapers", name: "วอลเปเปอร์อนิเมะ", enName: "Anime/Wallpapers", slug: "w" }, // Anime wallpapers
      { id: "mecha", name: "หุ่นยนต์และเมคา", enName: "Mecha", slug: "m" }, // Mecha board
      { id: "cosplay", name: "คอสเพลย์และแฟชั่น", enName: "Cosplay & EGL", slug: "cgl" }, // Cosplay board
      { id: "cute-male", name: "หนุ่มน่ารัก & โชเน็น", enName: "Cute/Male", slug: "cm" }, // Cute male board
      { id: "flash", name: "แฟลชและแอนิเมชัน", enName: "Flash", slug: "f" }, // Flash animation board
      { id: "transportation", name: "ยานยนต์และคมนาคม", enName: "Transportation", slug: "n" }, // Transportation board
      { id: "otaku", name: "วัฒนธรรมโอตาคุ", enName: "Otaku Culture", slug: "jp" }, // Otaku culture board
      { id: "vtuber", name: "เวอร์ชวลยูทูบเบอร์", enName: "Virtual YouTubers", slug: "vt" }, // VTubers board
    ], // End boards
  }, // End Japanese Culture
  { // Video Games column
    groupName: "วิดีโอเกม", // Thai group title
    groupEnName: "Video Games", // English group title
    boards: [ // Boards list
      { id: "video-games", name: "วิดีโอเกมทั่วไป", enName: "Video Games", slug: "v" }, // Video games
      { id: "vg-generals", name: "สนทนาเกมทั่วไป", enName: "Video Game Generals", slug: "vg" }, // VG Generals
      { id: "vg-multiplayer", name: "เกมออนไลน์หลายคน", enName: "Video Games/Multiplayer", slug: "vm" }, // Multiplayer
      { id: "vg-mobile", name: "เกมมือถือ", enName: "Video Games/Mobile", slug: "vmg" }, // Mobile games
      { id: "pokemon", name: "โปเกมอน", enName: "Pokémon", slug: "vp" }, // Pokemon
      { id: "retro-games", name: "เกมย้อนยุค เรโทร", enName: "Retro Games", slug: "vr" }, // Retro games
      { id: "vg-rpg", name: "เกมสวมบทบาท RPG", enName: "Video Games/RPG", slug: "vrpg" }, // RPG games
      { id: "vg-strategy", name: "เกมวางแผนกลยุทธ์", enName: "Video Games/Strategy", slug: "vst" }, // Strategy games
    ], // End boards
  }, // End Video Games
  { // Interests column
    groupName: "ความสนใจ & วิทยาการ", // Thai group title
    groupEnName: "Interests", // English group title
    boards: [ // Boards list
      { id: "comics", name: "การ์ตูนและคอมิกส์", enName: "Comics & Cartoons", slug: "co" }, // Comics
      { id: "tech", name: "เทคโนโลยี", enName: "Technology", slug: "g" }, // Technology
      { id: "tv-film", name: "ภาพยนตร์และซีรีส์", enName: "Television & Film", slug: "tv" }, // TV and film
      { id: "weapons", name: "ยุทโธปกรณ์", enName: "Weapons", slug: "k" }, // Weapons
      { id: "auto", name: "ยานยนต์และรถยนต์", enName: "Auto", slug: "o" }, // Auto
      { id: "nature", name: "สัตว์โลกและธรรมชาติ", enName: "Animals & Nature", slug: "an" }, // Nature
      { id: "trad-games", name: "บอร์ดเกมและเกมดั้งเดิม", enName: "Traditional Games", slug: "tg" }, // Traditional games
      { id: "sports", name: "กีฬา", enName: "Sports", slug: "sp" }, // Sports
      { id: "extreme-sports", name: "เอ็กซ์ตรีมสปอร์ต", enName: "Extreme Sports", slug: "xs" }, // Extreme sports
      { id: "wrestling", name: "มวยปล้ำอาชีพ", enName: "Professional Wrestling", slug: "pw" }, // Wrestling
      { id: "science-math", name: "วิทยาศาสตร์และคณิตศาสตร์", enName: "Science & Math", slug: "sci" }, // Science and math
      { id: "history", name: "ประวัติศาสตร์และมนุษยศาสตร์", enName: "History & Humanities", slug: "his" }, // History
      { id: "international", name: "นานาชาติ", enName: "International", slug: "int" }, // International
      { id: "outdoors", name: "กิจกรรมกลางแจ้ง", enName: "Outdoors", slug: "out" }, // Outdoors
      { id: "toys", name: "ของเล่นและของสะสม", enName: "Toys", slug: "toys" }, // Toys
    ], // End boards
  }, // End Interests
  { // Creative column
    groupName: "สร้างสรรค์ & ศิลปะ", // Thai group title
    groupEnName: "Creative", // English group title
    boards: [ // Boards list
      { id: "oekaki", name: "ภาพวาดโอเอะกากิ", enName: "Oekaki", slug: "oekaki" }, // Oekaki
      { id: "papercraft", name: "งานพับกระดาษ & หัตถกรรม", enName: "Papercraft & Origami", slug: "papercraft" }, // Origami
      { id: "photo", name: "การถ่ายภาพ", enName: "Photography", slug: "photography" }, // Photography
      { id: "food", name: "อาหารและการทำอาหาร", enName: "Food & Cooking", slug: "food" }, // Food
      { id: "artwork", name: "ภาพวาดและงานศิลป์", enName: "Artwork/Critique", slug: "artwork" }, // Artwork
      { id: "wallpapers", name: "วอลเปเปอร์ทั่วไป", enName: "Wallpapers/General", slug: "wallpapers" }, // Wallpapers
      { id: "literature", name: "วรรณกรรมและการเขียน", enName: "Literature", slug: "literature" }, // Literature
      { id: "music", name: "ดนตรีและเพลง", enName: "Music", slug: "music" }, // Music
      { id: "fashion", name: "แฟชั่นและสไตล์", enName: "Fashion", slug: "fashion" }, // Fashion
      { id: "3dcg", name: "คอมพิวเตอร์กราฟิก 3D", enName: "3DCG", slug: "3d" }, // 3DCG
      { id: "graphic-design", name: "กราฟิกดีไซน์", enName: "Graphic Design", slug: "design" }, // Graphic design
      { id: "diy", name: "งานประดิษฐ์ D.I.Y.", enName: "Do-It-Yourself", slug: "diy" }, // DIY
      { id: "worksafe-gif", name: "ภาพแอนิเมชัน GIF", enName: "Worksafe GIF", slug: "gif" }, // GIF
      { id: "quests", name: "เควสต์และการเล่าเรื่อง", enName: "Quests", slug: "qst" }, // Quests
    ], // End boards
  }, // End Creative
  { // Other column
    groupName: "เรื่องอื่นๆ & ไลฟ์สไตล์", // Thai group title
    groupEnName: "Other", // English group title
    boards: [ // Boards list
      { id: "finance", name: "การเงินและการลงทุน", enName: "Business & Finance", slug: "finance" }, // Business
      { id: "travel", name: "การท่องเที่ยว", enName: "Travel", slug: "travel" }, // Travel
      { id: "fitness", name: "สุขภาพและการออกกำลังกาย", enName: "Fitness", slug: "fit" }, // Fitness
      { id: "paranormal", name: "เรื่องลี้ลับเหนือธรรมชาติ", enName: "Paranormal", slug: "x" }, // Paranormal
      { id: "advice", name: "ปรึกษาและคำแนะนำ", enName: "Advice", slug: "adv" }, // Advice
      { id: "lgbt", name: "ความหลากหลายทางเพศ", enName: "LGBT", slug: "lgbt" }, // LGBT
      { id: "current-news", name: "ข่าวสารปัจจุบัน", enName: "Current News", slug: "news" }, // News
      { id: "worksafe-req", name: "คำขอทั่วไป", enName: "Worksafe Requests", slug: "wsr" }, // Requests
      { id: "vip", name: "กระทู้สาระสำคัญ", enName: "Very Important Posts", slug: "vip" }, // VIP
    ], // End boards
  }, // End Other
  { // MISC. column containing the prominent Board entry
    groupName: "เบ็ดเตล็ด & ทั่วไป", // Thai group title
    groupEnName: "MISC.", // English group title
    boards: [ // Boards list
      { id: "board", name: "Board", enName: "Board", slug: "board", isSpecial: true }, // The main old landing page Board!
      { id: "random", name: "สัพเพเหระ", enName: "Random", slug: "random" }, // Random board
      { id: "general", name: "พูดคุยทั่วไป", enName: "General Discussion", slug: "general" }, // General board
      { id: "society", name: "ชีวิตและสังคม", enName: "Life & Society", slug: "society" }, // Society board
      { id: "vent", name: "ปัญหาชีวิต/ระบาย", enName: "Confessions & Venting", slug: "vent" }, // Vent board
      { id: "qa", name: "ถามตอบความรู้", enName: "Q&A & Knowledge", slug: "qa" }, // QA board
    ], // End boards
  }, // End MISC.
]; // End BOARD_DIRECTORY

export function findBoard(query: string): { board: BoardItem; group: BoardCategoryGroup } | null { // Resolves board item by query
  if (!query) return null; // Guard against empty query
  const q = query.trim().toLowerCase(); // Normalize query string
  for (const group of BOARD_DIRECTORY) { // Loop category groups
    for (const b of group.boards) { // Loop boards inside group
      if ( // Match board attributes
        b.name.toLowerCase() === q || // Match Thai name
        b.enName.toLowerCase() === q || // Match English name
        b.slug.toLowerCase() === q || // Match slug
        b.id.toLowerCase() === q || // Match ID
        (q === "board" && b.slug === "board") // Direct Board match
      ) { // If match found
        return { board: b, group }; // Return board with parent group
      } // End match
    } // End board loop
  } // End group loop
  return null; // Return null if not found
} // End findBoard
