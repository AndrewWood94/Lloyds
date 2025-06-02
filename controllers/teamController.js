const pool = require('../db'); 
const { toTitleCase } = require('../utils');
const leagueService = require('../services/leagueService')

const createTeam = async (req, res) => {
  const { name: teamName, league_name: leagueName, league_country: leagueCountry  } = req.body;
  
  try {
    if (!teamName) {
      return res.status(400).json({ error: 'Team name is required' });
    }
    if (!leagueName) {
      return res.status(400).json({ error: 'League name is required to associate the team.' });
    }
    const leagueResult = await leagueService.findLeagueID(leagueName, leagueCountry);
    if (leagueResult.errorDetail) {
      return res.status(leagueResult.errorDetail.status).json({ error: leagueResult.errorDetail.message });
    }
    const { league_id } = leagueResult;

    const newTeamResult = await pool.query('INSERT INTO teams (name, league_id) VALUES ($1, $2) RETURNING *', [teamName, league_id]);
    res.status(201).json(newTeamResult.rows[0]);
    
  } catch (err) {
    if (err.code === '23505') { // Unique constraint violation
      return res.status(409).json({ error: `Team with name "${teamName}" already exists in this league.` });
    }
    else{
      console.error(err.stack);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

const getTeams = async (req, res) => {
  try {
    const { country, league_name: leagueName } = req.query;
    let queryText = `
      SELECT t.id, t.name AS team_name, t.created_at, l.name AS league_name, l.country AS league_country
      FROM teams t
      LEFT JOIN leagues l ON t.league_id = l.id`;
    const queryParams = [];
    const conditions = [];

    if (country) {
      queryParams.push(country);
      conditions.push(`l.country = $${queryParams.length}`);
    }
    if (leagueName) {
      queryParams.push(leagueName);
      conditions.push(`l.name = $${queryParams.length}`);
    }

    if (conditions.length > 0) {
      queryText += ` WHERE ${conditions.join(' AND ')}`;
    }
    queryText += ' ORDER BY t.name ASC';

    const result = await pool.query(queryText, queryParams);
    const formattedRows = result.rows.map(row => ({
      ...row,
      league_name: toTitleCase(row.league_name),
      league_country: toTitleCase(row.league_country),
    }));
    res.json(formattedRows);
  } catch (err) {
    console.error("Error in getTeams:", err.stack);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  createTeam,
  getTeams,
};
