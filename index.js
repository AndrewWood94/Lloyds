// /home/awood15/personal/Lloyds/index.js
require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const { Pool } = require ('pg');
const app = express();
const port = process.env.PORT || 3000; // Use environment variable for port or default to 3000

//Database
const dbConfig = {
  user: process.env.DB_USER,
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432
};

const pool = new Pool(dbConfig);

app.use(express.json());


app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from my Node.js API!' });
});

app.post('/api/leagues', async (req, res) => {
  try {
    const { name, country } = req.body;
    if (!name || !country) {
      return res.status(400).json({ error: 'League name and country are required' });
    }
    const newLeague = await pool.query('INSERT INTO leagues (name, country) VALUES ($1, $2) RETURNING *', [name, country]);
    res.status(201).json(newLeague.rows[0]);
  } catch (err) {
    console.error(err.stack);
    if (err.code === '23505') { // Unique violation
      return res.status(409).json({ error: 'League with this name already exists in this country.' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/leagues', async (req, res) => {
  try {
    const allLeagues = await pool.query('SELECT * FROM leagues ORDER BY created_at DESC');
    res.json(allLeagues.rows);
  } catch (err) {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Teams Endpoints ---
app.post('/api/teams', async (req, res) => {
  try {
    const { name, league_id } = req.body; // Expecting league_id to be provided
    if (!name) {
      return res.status(400).json({ error: 'Team name is required' });
    }
    if (league_id && isNaN(parseInt(league_id))) {
      return res.status(400).json({ error: 'Valid league_id (integer) is required if provided' });
    }

    // Optional: Check if league_id exists before inserting
    if (league_id) {
      const leagueExists = await pool.query('SELECT id FROM leagues WHERE id = $1', [league_id]);
      if (leagueExists.rows.length === 0) {
        return res.status(404).json({ error: `League with id ${league_id} not found.` });
      }
    }

    const newTeam = await pool.query('INSERT INTO teams (name, league_id) VALUES ($1, $2) RETURNING *', [name, league_id || null]);
    res.status(201).json(newTeam.rows[0]);
  } catch (err) {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/teams', async (req, res) => {
  try {
    // Join with leagues table to get league name
    const allTeams = await pool.query(`
      SELECT t.id, t.name, t.created_at, l.name AS league_name, l.country AS league_country
      FROM teams t
      LEFT JOIN leagues l ON t.league_id = l.id
      ORDER BY t.name ASC
    `);
    res.json(allTeams.rows);
  } catch (err) {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(port, () => {
  console.log(`API server listening on port ${port}`);
});

