const express = require("express")
require('dotenv').config();
const { Pool } = require("pg")
const cors = require('cors');
const rateLimit = require("express-rate-limit");
const path = require("path");

// HTML
const app = express()
app.use(express.json())
app.use(express.static(path.join(__dirname, "../website")));

// CORS
app.use(cors({
  origin: [
    "https://sanndex.org",
    "https://www.youtube.com",
    "https://x.com"
  ],
  credentials: true
}));

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
app.set("trust proxy", 1);

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// passport
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE id=$1",
      [id]
    );

    done(null, result.rows[0]);
  } catch (err) {
    done(err, null);
  }
});

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "https://sanndex.org/auth/google/callback"
  },
  async (accessToken, refreshToken, profile, done) => {

    const email = profile.emails[0].value;
    const googleId = profile.id;
    const name = profile.displayName;

    let user = await pool.query(
      "SELECT * FROM users WHERE google_id=$1",
      [googleId]
    );

    if (user.rows.length === 0) {
      user = await pool.query(
        `INSERT INTO users (google_id, email, username)
         VALUES ($1,$2,$3) RETURNING *`,
        [googleId, email, name]
      );
    }

    done(null, user.rows[0]);
  }
));

// Functions
async function getUserByUserId(userId) {
  if (!userId) return null;

  const userRes = await pool.query(
    `SELECT * FROM users WHERE id = $1`,
    [userId]
  );

  if (userRes.rows.length === 0) return null; // no source found for that name
  return userRes.rows[0].id;
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

  const sourceRes = await pool.query(
    `SELECT * FROM sources WHERE id = $1`,
    [sourceId]
  );

  return sourceRes.rows[0];
}

async function getReviewBySourceId(sourceId) {
  if (!sourceId) return null;

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

function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: "Not logged in" });
  }
  next();
}

// Authenticate with Google
app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// Sign in with Google
app.get("/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => {
    res.redirect("/dashboard");
  }
);

// Get User Id
app.get("/me", async (req, res) => {
  if (!req.user) {
    return res.json({ loggedIn: false });
  }

  res.json({
    loggedIn: true,
    user: {
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      persmission: req.user.persmission,
    }
  });
});

// Logout
app.post("/logout", (req, res) => {

  req.logout(function(err) {
    if (err) {
      return res.status(500).json({ error: "Logout failed" });
    }

    req.session.destroy(() => {
      res.json({ success: true });
    });
    res.redirect("/");
  });

});

// Change username
app.post("/username", requireAuth, async (req, res) => {
  const { username } = req.body;

  if ( !username ) {
    return res.status(400).json({ error: "Missing fields" });
  }

  await pool.query(
    `UPDATE users 
      SET username = $1
      WHERE id = $2`,
    [username, req.user.id]
  );
  
  res.redirect("/account");
})

// Access all account reports
app.get("/reports", async(req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: "Missing fields" });
  }

  let reportRes = await pool.query(
    `SELECT * FROM reports 
      WHERE user_id = $1`,
    [userId]
  );

  res.json(reportRes);
});

// Access source info
app.get("/source", async (req, res) => {
  try {
    const domain = req.query.domain;

    if (!domain) {
      return res.status(400).json({ error: "Domain query parameter required" });
    }

    // Get the sourceId first
    let sourceId = await getSourceIdByDomain(domain);

    // Check name directly
    if (!sourceId) {
      sourceId = await getSourceIdByName(domain);
    }

    // Null check for unregistered sources
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
  console.log("REPORT BODY:", req.body);

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

// page routes
const site = path.join(__dirname,"../website")

app.get("/", (req,res)=> res.sendFile(site+"/index.html"))
app.get("/login", (req,res)=> res.sendFile(site+"/login.html"))
app.get("/dashboard", (req,res)=> res.sendFile(site+"/dashboard.html"))
app.get("/account", (req,res)=> res.sendFile(site+"/account.html"))
app.get("/review/:name", (req,res)=> res.sendFile(site+"/review.html"))

app.use((err, req, res, next) => {
  console.error("SERVER ERROR:", err);
  res.status(500).send("Internal Server Error");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});