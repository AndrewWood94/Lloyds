const pool = require('../db');
const { toTitleCase } = require('../utils');

const getLeagues = async (req, res) => {
    try {
      const { country } = req.query;
  
      let queryText = 'SELECT * FROM leagues';
      const queryParams = [];
  
      if (country) {
        queryText += ' WHERE country = $1';
        queryParams.push(country);
      }
  
      queryText += ' ORDER BY created_at DESC';
      const allLeagues = await pool.query(queryText, queryParams);
      const formattedLeagues = allLeagues.rows.map(league => ({
        ...league,
        name: toTitleCase(league.name),
        country: toTitleCase(league.country),
      }));
      res.json(formattedLeagues);
    } catch (err) {
      console.error("Error in getLeagues:", err.stack);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
  
  const createLeague = async (req, res) => {
    const { name: rawName, country: rawCountry } = req.body;
    try {
      if (!rawName || !rawCountry) {
        return res.status(400).json({ error: 'League name and country are required' });
      }
      const titleCaseName = toTitleCase(rawName);
      const titleCaseCountry = toTitleCase(rawCountry);
      const newLeague = await pool.query('INSERT INTO leagues (name, country) VALUES ($1, $2) RETURNING *', [titleCaseName, titleCaseCountry]);
      res.status(201).json(newLeague.rows[0]);
    } catch (err) {
      if (err.code === '23505') { // Unique violation
        return res.status(409).json({ error: `League with name "${rawName}" already exists in "${rawCountry}".` });
      }
      else{
        console.error("Error in createLeague:", err.stack);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  };
  
  module.exports = {
    getLeagues,
    createLeague,
  };