const express = require("express")
require('dotenv').config();
const { Pool } = require("pg")
const cors = require('cors');

const app = express()
app.use(express.json())
app.use(cors()); // allow all origins during dev

// Database fetch
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT, 10),
})

async function getSourceIdByDomain(domain) {
  if (!domain) return null;

  const sourceRes = await pool.query(
    `SELECT source_id FROM source_domains WHERE domain = $1`,
    [domain]
  );

  if (sourceRes.rows.length === 0) {
    return null; // no source found for that domain
  }

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

app.listen(3000, () => {
  console.log("Server running on port 3000")
})