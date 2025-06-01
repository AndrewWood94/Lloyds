const pool = require('../db'); // Import the shared pool

const createTeam = async (req, res) => {
  const { name, league_name, league_country } = req.body;
  try {
    if (!name) {
      return res.status(400).json({ error: 'Team name is required' });
    }
    if (!league_name) {
      return res.status(400).json({ error: 'League name is required to associate the team.' });
    }

    let league_id;
    const existingLeaguesByName = await pool.query('SELECT id, country FROM leagues WHERE name = $1', [league_name]);

    if (existingLeaguesByName.rows.length === 0) {
      return res.status(404).json({ error: `No league found with name: "${league_name}"` });
    } else if (existingLeaguesByName.rows.length === 1) {
      const foundLeague = existingLeaguesByName.rows[0];
      if (league_country && league_country !== foundLeague.country) {
        return res.status(404).json({
          error: `League "${league_name}" exists, but not in country "${league_country}". It is in "${foundLeague.country || 'N/A'}".`
        });
      }
      league_id = foundLeague.id;
    } else {
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
};

const getTeams = async (req, res) => {
  try {
    const { country, league_name: leagueNameQuery } = req.query;
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
};

module.exports = {
  createTeam,
  getTeams,
};