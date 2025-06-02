require('dotenv').config(); // Load environment variables from .env file for local run
const express = require('express');
const app = express();
const port = process.env.PORT || 3000; // Use environment variable for port or default to 3000

const leagueController = require('./controllers/leagueController');
const teamController = require('./controllers/teamController');

const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const swaggerDocument = YAML.load('./openapi.yaml');

app.use(express.json());

app.get('/api', (req, res) => {
  res.json({ message: 'Welcome to the API to track football leagues and teams!' });
});

app.post('/api/leagues', leagueController.createLeague);
app.get('/api/leagues', leagueController.getLeagues)

app.post('/api/teams', teamController.createTeam);
app.get('/api/teams', teamController.getTeams);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

if (require.main === module) {
  app.listen(port, () => {
    console.log(`API server listening on port ${port}`);
  });
}

module.exports = app;

