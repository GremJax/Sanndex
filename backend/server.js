const express = require("express")
require('dotenv').config();
const { Pool } = require("pg")
const cors = require('cors');
const rateLimit = require("express-rate-limit");

const app = express()
app.use(express.json())
app.use(cors()); // allow all origins during dev
app.use(express.static("public"));

// basic limiter
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 60,             // limit each IP to 60 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Slow down." }
});

app.use(limiter);

// Database fetch
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function insertSourceWithDomain(name, domain) {
  if (!domain || !name) return;

  // Insert into sources
  const result = await pool.query(
    `INSERT INTO sources (name) VALUES ($1) RETURNING id`,
    [name.toLowerCase()]
  );
  const sourceId = result.rows[0].id;

  // Insert into source_domains
  await insertDomainBySourceId(sourceId, domain);

  return sourceId;
}

async function insertDomainBySourceId(sourceId, domain) {
  if (!sourceId || !domain) return;

  // Insert into source_domains
  await pool.query(
    `INSERT INTO source_domains (source_id, domain) VALUES ($1, $2)`,
    [sourceId, domain.toLowerCase()]
  );
}

async function getSourceIdByName(name) {
  if (!name) return null;

  const sourceRes = await pool.query(
    `SELECT id FROM sources WHERE name = $1`,
    [name.toLowerCase()]
  );

  if (sourceRes.rows.length === 0) return null; // no source found for that name
  return sourceRes.rows[0].id;
}

async function insertSourceWithDomain(name, domain) {
  if (!domain || !name) return;

  // Insert into sources
  const result = await pool.query(
    `INSERT INTO sources (name) VALUES ($1) RETURNING id`,
    [name.toLowerCase()]
  );
  const sourceId = result.rows[0].id;

  // Insert into source_domains
  await insertDomainBySourceId(sourceId, domain);

  return sourceId;
}

async function insertDomainBySourceId(sourceId, domain) {
  if (!sourceId || !domain) return;

  // Insert into source_domains
  await pool.query(
    `INSERT INTO source_domains (source_id, domain) VALUES ($1, $2)`,
    [sourceId, domain.toLowerCase()]
  );
}

async function getSourceIdByName(name) {
  if (!name) return null;

  const sourceRes = await pool.query(
    `SELECT id FROM sources WHERE name = $1`,
    [name.toLowerCase()]
  );

  if (sourceRes.rows.length === 0) return null; // no source found for that name
  return sourceRes.rows[0].id;
}

async function getSourceIdByDomain(domain) {
  if (!domain) return null;

  const sourceRes = await pool.query(
    `SELECT source_id FROM source_domains WHERE domain = $1`,
    [domain.toLowerCase()]
  );

  if (sourceRes.rows.length === 0) return null; // no source found for that domain
  return sourceRes.rows[0].source_id;
}

async function getReviewBySourceId(sourceId) {
  if (!sourceId) return null;

  // Query database for reviews
  const reviewRes = await pool.query(
    `SELECT *
      FROM reviews
      WHERE source_id = $1
      ORDER BY num DESC
      LIMIT 1`,
    [sourceId]
  );

  if (reviewRes.rows.length === 0) {
    return null; // no reviews yet
  }

  // Return found source
  return reviewRes.rows[0];
}

app.get("/source", async (req, res) => {
  try {
    const domain = req.query.domain;

    if (!domain) {
      return res.status(400).json({ error: "Domain query parameter required" });
    }

    // Get the sourceId first
    const sourceId = await getSourceIdByDomain(domain);

    // Null check before querying reviews
    if (!sourceId) {
      return res.status(404).json({ error: "No source found for that domain" });
    }

    // Get the top review
    const topReview = await getReviewBySourceId(sourceId);

    if (!topReview) {
      return res.status(404).json({ error: "No reviews found for this source" });
    }

    res.json(topReview);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
})

async function init() {
  const sourceId = await getSourceIdByName("nuxanor");
  if (sourceId) {
    await insertDomainBySourceId(sourceId, "youtube/nuxanor");
  } else {
    console.log("Nuxanor not found")
  }
}

//init();

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});