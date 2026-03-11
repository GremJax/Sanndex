const express = require("express")
require('dotenv').config();
const { Pool } = require("pg")
const cors = require('cors');
const rateLimit = require("express-rate-limit");

// HTML
const app = express()
app.use(express.json())

// CORS
app.use(cors({
  origin: [
    "https://sanndex.org",
    "https://www.youtube.com",
    "https://x.com"
  ],
  credentials: true
}));

// Static website
app.use(express.static("public"));

// limiter
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 600,            // 600 req/min
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Slow down." }
});
app.use(limiter);

// session
const session = require("express-session");
app.use(session({
  name: "sanndex_session",
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 1000 * 60 * 60 * 24 * 30
  }
}));

// passport
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

app.use(passport.initialize());
app.use(passport.session());

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback"
  },
  async (accessToken, refreshToken, profile, done) => {

    const email = profile.emails[0].value;
    const googleId = profile.id;

    let user = await pool.query(
      "SELECT * FROM users WHERE google_id=$1",
      [googleId]
    );

    if (user.rows.length === 0) {
      user = await pool.query(
        `INSERT INTO users (google_id, email)
         VALUES ($1,$2) RETURNING *`,
        [googleId, email]
      );
    }

    done(null, user.rows[0]);
  }
));

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Functions
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

async function getSourceBySourceId(sourceId) {
  if (!sourceId) return null;

  // Query database for reviews
  const sourceRes = await pool.query(
    `SELECT * FROM sources WHERE id = $1`,
    [sourceId]
  );

  return sourceRes.rows[0];
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

function getTotalScore(data) {
  if (!data) return null;
  return (
    data.accuracy_score + 
    data.transparency_score + 
    data.integrity_score +
    data.manipulation_score +
    data.authenticity_score +
    data.credibility_score
  ) / 6
}

// Authenticate with Google
app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// Sign in with Google
app.get("/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => {

    req.session.userId = req.user.id;
    res.redirect("/dashboard");
  }
);

// Get User Id
app.get("/me", (req, res) => {
  if (!req.session.userId) {
    return res.json({ userId: null });
  }
  res.json({ userId: req.session.userId });
});

// Logout
app.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

// Access source info
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

    // Get the account information
    const source = await getSourceBySourceId(sourceId);

    // Get the top review
    const topReview = await getReviewBySourceId(sourceId);

    if (!topReview) {
      return res.status(404).json({ error: "No reviews found for this source" });
    }

    res.json({
      source: source,
      review: topReview,
      score: getTotalScore(topReview),
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Post report
app.post("/report", async (req, res) => {

  const { sourceId, userId, url, description, 
    accuracy_score,
    transparency_score,
    integrity_score,
    manipulation_score,
    authenticity_score,
    credibility_score 
  } = req.body;

  if (!sourceId ||
    !accuracy_score ||
    !transparency_score ||
    !integrity_score ||
    !manipulation_score ||
    !authenticity_score ||
    !credibility_score ) {
    return res.status(400).json({ error: "Missing fields" });
  }

  await pool.query(
    `INSERT INTO reports
      (source_id, user_id, evidence_url, description, 
      accuracy_score,
      transparency_score,
      integrity_score,
      manipulation_score,
      authenticity_score,
      credibility_score)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [sourceId, userId, url, description, 
      accuracy_score,
      transparency_score,
      integrity_score,
      manipulation_score,
      authenticity_score,
      credibility_score 
    ]
  );

  res.json({ success: true });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});