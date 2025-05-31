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

app.get('/', (req, res) => {
  res.status(200).send('OK');
});

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
    const { country } = req.query; // Get the optional country query parameter
    let queryText = 'SELECT * FROM leagues';
    const queryParams = [];

    if (country) {
      queryText += ' WHERE country = $1';
      queryParams.push(country);
    }

    queryText += ' ORDER BY created_at DESC';

    const allLeagues = await pool.query(queryText, queryParams);

    res.json(allLeagues.rows);
  } catch (err) {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Teams Endpoints ---
app.post('/api/teams', async (req, res) => {
  const { name, league_name, league_country } = req.body; // Expecting league_id to be provided
  try {
    if (!name) {
      return res.status(400).json({ error: 'Team name is required' });
    }
    if (!league_name) {
      return res.status(400).json({ error: 'League name is required to associate the team.' });
    }

    let league_id;
    // Check for leagues with the given name
    const existingLeaguesByName = await pool.query('SELECT id, country FROM leagues WHERE name = $1', [league_name]);

    if (existingLeaguesByName.rows.length === 0) {
      return res.status(404).json({ error: `No league found with name: "${league_name}"` });
    } else if (existingLeaguesByName.rows.length === 1) {
      // Only one league with this name, country is optional (or can be used for verification if provided)
      const foundLeague = existingLeaguesByName.rows[0];
      if (league_country && league_country !== foundLeague.country) {
        return res.status(404).json({ 
          error: `League "${league_name}" exists, but not in country "${league_country}". It is in "${foundLeague.country || 'N/A'}".` 
        });
      }
      league_id = foundLeague.id;
    } else {
      // Multiple leagues with this name, country is now mandatory
      if (!league_country) {
        return res.status(400).json({ error: `Multiple leagues exist with name "${league_name}". Please provide league_country.` });
      }
      const specificLeague = existingLeaguesByName.rows.find(l => l.country === league_country);
      if (!specificLeague) {
        return res.status(404).json({ error: `League "${league_name}" not found in country "${league_country}".` });
      }
      league_id = specificLeague.id;
    }

    const newTeam = await pool.query('INSERT INTO teams (name, league_id) VALUES ($1, $2) RETURNING *', [name, league_id]);
    res.status(201).json(newTeam.rows[0]);
  } catch (err) {
    console.error(err.stack);
    if (err.code === '23505') { // Unique constraint violation
      return res.status(409).json({ error: `Team with name "${name}" already exists in this league.` });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/teams', async (req, res) => {
  try {
    const { country, league_name: leagueNameQuery } = req.query; // Get optional query parameters
    let queryText = `
      SELECT t.id, t.name AS team_name, t.created_at, l.name AS league_name, l.country AS league_country
      FROM teams t
      LEFT JOIN leagues l ON t.league_id = l.id
    `;
    const queryParams = [];
    const conditions = [];

    if (country) {
      queryParams.push(country);
      conditions.push(`l.country = $${queryParams.length}`);
    }
    if (leagueNameQuery) {
      queryParams.push(leagueNameQuery);
      conditions.push(`l.name = $${queryParams.length}`);
    }
    
    if (conditions.length > 0) {
      queryText += ` WHERE ${conditions.join(' AND ')}`;
    }
    queryText += ' ORDER BY t.name ASC';

    const result = await pool.query(queryText, queryParams);
    res.json(result.rows);
      

  } catch (err) {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal server error' });
  }
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`API server listening on port ${port}`);
  });
}

module.exports = app;

