// /home/awood15/personal/Lloyds/seed.js
require('dotenv').config(); // Load environment variables from .env file
const { Pool } = require('pg');
const { toTitleCase } = require('./utils'); 

const dbConfig = {
  user: process.env.DB_USER,
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
};

const pool = new Pool(dbConfig);

const createTables = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS leagues (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      country VARCHAR(255),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (name, country)
    )
  `);
  console.log("Table 'leagues' initialized or already exists.");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS teams (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      league_id INTEGER REFERENCES leagues(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (name, league_id)
    )
  `);
  console.log("Table 'teams' initialized or already exists.");
};

const seedData = async () => {
  const leagueCount = await pool.query('SELECT COUNT(*) FROM leagues');
  if (parseInt(leagueCount.rows[0].count, 10) === 0) {
    console.log('Seeding leagues...');
    const premierLeague = await pool.query(
      "INSERT INTO leagues (name, country) VALUES ($1, $2) RETURNING id",
      [toTitleCase('Premier League'), toTitleCase('England')]
    );
    const laLiga = await pool.query(
      "INSERT INTO leagues (name, country) VALUES ($1, $2) RETURNING id",
      [toTitleCase('La Liga'), toTitleCase('Spain')]
    );
    const bundesliga = await pool.query(
      "INSERT INTO leagues (name, country) VALUES ($1, $2) RETURNING id",
      [toTitleCase('Bundesliga'), toTitleCase('Germany')]
    );
    const serieA = await pool.query(
      "INSERT INTO leagues (name, country) VALUES ($1, $2) RETURNING id",
      [toTitleCase('Serie A'), toTitleCase('Italy')]
    );
    const ligue1 = await pool.query(
      "INSERT INTO leagues (name, country) VALUES ($1, $2) RETURNING id",
      [toTitleCase('Ligue 1'), toTitleCase('France')]
    );
    const championship = await pool.query(
      "INSERT INTO leagues (name, country) VALUES ($1, $2) RETURNING id",
      [toTitleCase('Championship'), toTitleCase('England')]
    );
    const scottishPrem = await pool.query(
      "INSERT INTO leagues (name, country) VALUES ($1, $2) RETURNING id",
      [toTitleCase('Scottish Premiership'), toTitleCase('Scotland')]
    );
    console.log('Leagues seeded.');

    console.log('Seeding teams...');
    const teamsToInsert = [
        // Premier League
        { name: 'Manchester City', league_id: premierLeague.rows[0].id },
        { name: 'Arsenal', league_id: premierLeague.rows[0].id },
        { name: 'Liverpool', league_id: premierLeague.rows[0].id },
        // La Liga
        { name: 'Real Madrid', league_id: laLiga.rows[0].id }, // Example of direct casing
        { name: 'FC Barcelona', league_id: laLiga.rows[0].id }, // Example of direct casing
        // Bundesliga
        { name: 'Bayern Munich', league_id: bundesliga.rows[0].id },
        { name: 'Borussia Dortmund', league_id: bundesliga.rows[0].id },
        // Serie A
        { name: 'Inter Milan', league_id: serieA.rows[0].id },
        { name: 'AC Milan', league_id: serieA.rows[0].id },
        // Ligue 1
        { name: 'Paris Saint-Germain', league_id: ligue1.rows[0].id },
        { name: 'Olympique de Marseille', league_id: ligue1.rows[0].id },
        // Championship
        { name: 'Leicester City', league_id: championship.rows[0].id },
        { name: 'Leeds United', league_id: championship.rows[0].id },
        // Scottish Premiership
        { name: 'Celtic', league_id: scottishPrem.rows[0].id },
        { name: 'Rangers', league_id: scottishPrem.rows[0].id },
      ];
      if (teamsToInsert.length > 0) {
        const teamValues = teamsToInsert.map(team => `('${team.name.replace(/'/g, "''")}', ${team.league_id})`).join(',');
        const insertTeamsQuery = `INSERT INTO teams (name, league_id) VALUES ${teamValues};`;
        await pool.query(insertTeamsQuery);
      }
    console.log('Teams seeded.');
  } else {
    console.log('Database already contains league data. Skipping seeding.');
  }
};

const runSeed = async () => {
  try {
    await createTables();
    await seedData();
    console.log('Database seeding completed successfully.');
  } catch (err) {
    console.error('Error during database seeding:', err.stack);
    process.exit(1);
  } finally {
    await pool.end(); // Close the database connection pool
    console.log('Database connection pool closed.');
  }
};

runSeed();