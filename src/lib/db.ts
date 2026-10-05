// ==============================================================================
// File: .//Description-of-file/db.md
// Overview: MongoDB connection manager, connection caching, automated collection indexes, and initial seeds.
// ==============================================================================

import { MongoClient, Db } from "mongodb"; // Import MongoClient and Db types from official mongodb driver

// Declare global cache variable to preserve client connection across Next.js fast reloads in development
declare global { // Augment global scope
  var _mongoClientPromise: Promise<MongoClient> | undefined; // Cached MongoClient promise
} // End global declaration

const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/kratuu"; // Read connection string from environment
const dbName = process.env.MONGODB_DB_NAME || "kratuu"; // Read target database name

let clientPromise: Promise<MongoClient>; // Declare client promise variable

if (process.env.NODE_ENV === "development") { // In development mode, use global caching to prevent socket leakage
  if (!global._mongoClientPromise) { // If client promise is not yet initialized in global
    const client = new MongoClient(uri); // Instantiate new MongoClient
    global._mongoClientPromise = client.connect(); // Connect and cache promise globally
  } // End if
  clientPromise = global._mongoClientPromise; // Assign cached promise
} else { // In production mode, instantiate dedicated client connection
  const client = new MongoClient(uri); // Instantiate new MongoClient
  clientPromise = client.connect(); // Connect client
} // End if-else

let isInitialized = false; // Flag tracking if indexes and seed data have been initialized

async function ensureDatabaseInitialized(db: Db): Promise<void> { // Creates indexes and default sample data
  try { // Begin initialization try block
    // 1. Threads collection indexes
    await db.collection("threads").createIndex({ id: 1 }, { unique: true }); // Unique thread ID index
    await db.collection("threads").createIndex({ created_at: -1 }); // Chronological sorting index
    await db.collection("threads").createIndex({ category: 1 }); // Category filtering index
    await db.collection("threads").createIndex({ tags: 1 }); // Tag search index

    // 2. Comments collection indexes
    await db.collection("comments").createIndex({ id: 1 }, { unique: true }); // Unique comment ID index
    await db.collection("comments").createIndex({ thread_id: 1, created_at: 1 }); // Thread comments hierarchy index

    // 3. Users collection indexes
    await db.collection("users").createIndex({ id: 1 }, { unique: true }); // Unique user ID index
    await db.collection("users").createIndex({ username: 1 }, { unique: true }); // Unique username index
    await db.collection("users").createIndex({ email: 1 }, { unique: true, sparse: true }); // Sparse unique email index
    await db.collection("users").createIndex({ google_id: 1 }, { sparse: true }); // Sparse Google ID index

    // 4. Sessions collection indexes
    await db.collection("sessions").createIndex({ id: 1 }, { unique: true }); // Unique session ID index
    await db.collection("sessions").createIndex({ token: 1 }, { unique: true }); // Unique token lookup index
    await db.collection("sessions").createIndex({ expires_at: 1 }); // Expiration index

    // 5. Votes collection indexes
    await db.collection("votes").createIndex({ id: 1 }, { unique: true }); // Unique vote ID index
    await db.collection("votes").createIndex({ user_id: 1, target_id: 1, target_type: 1 }, { unique: true }); // One vote per target

    // 6. Email verifications collection indexes
    await db.collection("email_verifications").createIndex({ email: 1 }, { unique: true }); // Unique email OTP index
    await db.collection("email_verifications").createIndex({ expires_at: 1 }); // Expiration cleanup index

    // 7. Seed initial sample threads if collection is empty
    const threadCount = await db.collection("threads").countDocuments(); // Check existing thread count
    if (threadCount === 0) { // If database is fresh and empty
      const now = Date.now(); // Current unix epoch timestamp
      const sampleThreads = [ // Sample seed threads array
        { // First announcement thread
          id: "intro-kratuu-welcome", // Unique thread ID
          user_id: null, // Guest author
          title: "ยินดีต้อนรับสู่ kratuu (กระทู้) - ชุมชนแลกเปลี่ยนความคิดเห็นขาวดำ", // Title
          content: `### ยินดีต้อนรับสู่ kratuu\n\nkratuu คือเว็บบอร์ดที่ออกแบบด้วยแนวคิด **Swiss Minimalist** สองสีขาว-ดำ\n\n#### คุณสมบัติหลัก:\n- **โพสต์ได้ทันที**: ระบุชื่อเล่นและ PIN 4 หลัก ไม่ต้องสมัครสมาชิกให้ยุ่งยาก\n- **รองรับ Markdown**: เขียนโค้ด จัดตัวหนา ตัวเอียง หรือแนบลิงก์ได้เต็มรูปแบบ\n- **ระบบโหวตและแท็ก**: จัดเรียงตามความนิยมหรือล่าสุด\n- **ที่คั่นหน้าส่วนตัว (Bookmarks)**: บันทึกกระทู้ที่สนใจไว้ในเครื่องของคุณ\n\nลองตอบกลับหรือสร้างกระทู้ใหม่ได้เลยที่ปุ่มด้านบน`, // Markdown content
          author_name: "นายกระทู้ (Admin)", // Author
          author_pin: null, // Author PIN
          category: "พูดคุยทั่วไป", // Category
          tags: ["ยินดีต้อนรับ", "kratuu", "announcement"], // Tags array
          upvotes: 24, // Initial upvotes
          downvotes: 0, // Initial downvotes
          views: 182, // Initial views
          created_at: now - 3600000 * 5, // Timestamp 5 hours ago
          updated_at: now - 3600000 * 5, // Last update
        }, // End thread
        { // Second technology thread
          id: "tech-minimalist-web-design", // Unique thread ID
          user_id: null, // Guest author
          title: "ทำไมเว็บยุคนี้ถึงเริ่มย้อนกลับมาใช้ดีไซน์ขาวดำ Minimalist?", // Title
          content: `หลายปีที่ผ่านมา เว็บไซต์เต็มไปด้วยสีสัน แอนิเมชันหนักๆ และป็อปอัปที่กวนใจ\n\nการกลับมาของสไตล์ **High Contrast Black & White** ช่วยให้ผู้อ่านโฟกัสที่ **เนื้อหาและความคิด** มากกว่าสิ่งรบกวน\n\nทุกคนคิดเห็นอย่างไรกับการออกแบบแนวนี้ในการอ่านบทความยาวๆ ครับ?`, // Content
          author_name: "สมาชิกหมายเลข_9401", // Author
          author_pin: null, // Author PIN
          category: "เทคโนโลยี", // Category
          tags: ["เทคโนโลยี", "webdesign", "minimalism"], // Tags array
          upvotes: 18, // Upvotes
          downvotes: 1, // Downvotes
          views: 95, // Views
          created_at: now - 3600000 * 2, // Timestamp 2 hours ago
          updated_at: now - 3600000 * 2, // Last update
        }, // End thread
        { // Third lifestyle thread
          id: "pantip-nostalgia-topic", // Unique thread ID
          user_id: null, // Guest author
          title: "คิดถึงเสน่ห์ของเว็บบอร์ดแบบดั้งเดิม vs โซเชียลมีเดียฟีดในปัจจุบัน", // Title
          content: `ใครรู้สึกเหมือนกันบ้างว่าเว็บบอร์ดแบบกระทู้เปิดโอกาสให้คนได้ถกเถียงกันด้วยเหตุผลและข้อมูลมากกว่าอัลกอริทึมของโซเชียลมีเดียที่เน้นแต่ความโกรธและความไว?\n\nกระทู้หนึ่งกระทู้สามารถอยู่ได้เป็นสัปดาห์หรือเป็นเดือนโดยที่ยังมีคนเข้ามาตอบสาระดีๆ อยู่เรื่อยๆ`, // Content
          author_name: "คนชอบอ่าน", // Author
          author_pin: null, // Author PIN
          category: "ชีวิตและสังคม", // Category
          tags: ["ความรู้สึก", "pantip", "nostalgia", "ชีวิต"], // Tags array
          upvotes: 31, // Upvotes
          downvotes: 0, // Downvotes
          views: 210, // Views
          created_at: now - 3600000 * 1, // Timestamp 1 hour ago
          updated_at: now - 3600000 * 1, // Last update
        }, // End thread
      ]; // End sampleThreads

      await db.collection("threads").insertMany(sampleThreads); // Insert sample threads

      // Seed starter comments for the welcome thread
      const sampleComments = [ // Starter comments array
        { // Comment 1
          id: "c1", // ID
          thread_id: "intro-kratuu-welcome", // Target thread
          user_id: null, // Author ID
          parent_id: null, // Top-level
          content: "ชอบดีไซน์ขาวดำมากครับ สบายตา โหลดเร็ว ไม่รกตาเลย", // Content
          author_name: "ผู้อ่านนิรนาม", // Display name
          author_pin: null, // PIN
          upvotes: 5, // Upvotes
          downvotes: 0, // Downvotes
          created_at: now - 3600000 * 4, // Timestamp
        }, // End comment 1
        { // Comment 2
          id: "c2", // ID
          thread_id: "intro-kratuu-welcome", // Target thread
          user_id: null, // Author ID
          parent_id: "c1", // Nested reply to c1
          content: "เห็นด้วยเลย ตัวหนังสืออ่านง่ายและเน้นสาระจริงๆ ครับ", // Content
          author_name: "โปรแกรมเมอร์หัวใจชิล", // Display name
          author_pin: null, // PIN
          upvotes: 3, // Upvotes
          downvotes: 0, // Downvotes
          created_at: now - 3600000 * 3, // Timestamp
        }, // End comment 2
      ]; // End sampleComments

      await db.collection("comments").insertMany(sampleComments); // Insert sample comments
    } // End if empty
  } catch (err) { // Catch index or seeding errors
    console.error("[MongoDB] Initialization warning:", err); // Log warning
  } // End try-catch
} // End ensureDatabaseInitialized

export async function getDb(): Promise<Db> { // Returns connected MongoDB Db instance
  try { // Try connecting to MongoDB
    const client = await clientPromise; // Await client connection
    const db = client.db(dbName); // Select database instance
    if (!isInitialized) { // Check if initialization has occurred
      await ensureDatabaseInitialized(db); // Create indexes and seeds
      isInitialized = true; // Mark as initialized
    } // End check
    return db; // Return Db object
  } catch (err: unknown) { // Handle connection failures
    console.error("[MongoDB] Connection error:", err); // Log error
    throw new Error( // Re-throw descriptive error
      "Unable to connect to MongoDB. Please ensure MONGODB_URI is properly configured in your environment or .env.local." // Error text
    ); // End Error
  } // End try-catch
} // End getDb
