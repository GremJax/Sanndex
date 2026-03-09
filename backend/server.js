const express = require("express")
require('dotenv').config();
const { Pool } = require("pg")

const app = express()
app.use(express.json())

//console.log('DB_USER:', typeof process.env.DB_USER, process.env.DB_USER);
//console.log('DB_PASSWORD:', typeof process.env.DB_PASSWORD, process.env.DB_PASSWORD);
//console.log('DB_PORT:', typeof process.env.DB_PORT, process.env.DB_PORT);

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT, 10),
})

app.get("/source", async (req, res) => {
  const domain = req.query.domain
  const result = await pool.query(
    "SELECT * FROM sources WHERE domain = $1",
    [domain]
  )
  res.json(result.rows)
})

app.listen(3000, () => {
  console.log("Server running on port 3000")
})