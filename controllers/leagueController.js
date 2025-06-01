const pool = require('../db');

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
      res.json(allLeagues.rows);
    } catch (err) {
      console.error(err.stack);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
  
  const createLeague = async (req, res) => {
    try {
      const { name, country } = req.body;
      const newLeague = await pool.query('INSERT INTO leagues (name, country) VALUES ($1, $2) RETURNING *', [name, country]);
      res.status(201).json(newLeague.rows[0]);
    } catch (err) {
      console.error(err.stack);
      if (err.code === '23505') { // Unique violation
        return res.status(409).json({ error: 'League with this name already exists in this country.' });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  };
  
  module.exports = {
    getLeagues,
    createLeague,
  };