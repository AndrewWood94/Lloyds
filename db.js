const { Pool } = require('pg');

// Load environment variables if running locally
require('dotenv').config({ path: require('path').resolve(__dirname, './.env') });

const dbConfig = {
  user: process.env.DB_USER,
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432', 10), // Ensure port is an integer
};

module.exports = new Pool(dbConfig);