// /home/awood15/personal/Lloyds/index.js
require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const app = express();
const port = process.env.PORT || 3000; // Use environment variable for port or default to 3000

const leagueController = require('./controllers/leagueController');
const teamController = require('./controllers/teamController');

app.use(express.json());

app.get('/', (req, res) => {
  res.status(200).send('OK');
});

app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from my Node.js API!' });
});

app.post('/api/leagues', leagueController.createLeague);
app.get('/api/leagues', leagueController.getLeagues)

app.post('/api/teams', teamController.createTeam);
app.get('/api/teams', teamController.getTeams);

if (require.main === module) {
  app.listen(port, () => {
    console.log(`API server listening on port ${port}`);
  });
}

module.exports = app;

