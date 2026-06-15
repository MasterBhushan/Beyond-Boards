const fs = require("fs");
const path = require("path");
const pool = require("./db");

async function seed() {
  try {
    const careersPath = path.join(__dirname, "../data/careers.json");

    const careers = JSON.parse(
      fs.readFileSync(careersPath, "utf8")
    );

    console.log(`Found ${careers.length} careers.`);

    for (const career of careers) {
      await pool.query(
        `INSERT INTO careers
        (id, name, title, description, emoji, color, youtube_id, roadmap)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        ON CONFLICT (id) DO NOTHING`,
        [
          career.id,
          career.name,
          career.title,
          career.desc,
          career.emoji,
          career.color,
          career.youtubeId,
          JSON.stringify(career.roadmap)
        ]
      );
    }

    console.log("✅ Database Seeded Successfully");
    process.exit(0);

  } catch (err) {
    console.error("❌ Error seeding database:");
    console.error(err);
    process.exit(1);
  }
}

seed();