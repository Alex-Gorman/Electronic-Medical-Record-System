// server.js
const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');

const PORT = 3002;
const HOST = '0.0.0.0';

const DB_CONFIG = {
  host: 'mysql1',
  user: 'root',
  password: 'admin',
  database: 'emr_app_db',
};

const DEFAULT_USERS = [
  { username: 'Admin', password: 'Admin1234' },
  { username: 'jsmith', password: 'smith1234' },
  { username: 'gpaul', password: 'paul1234' },
];

/**
 * Attempts to connect to the MySQL database with retry logic
 * Retries connection with a limited number of times if initial attempts fail
 * 
 * @param {number} retries - Number of remaining retries
 * @param {number} delay - Delay between retries in milliseconds
 */
function connectWithRetry(retries = 10, delay = 2000) {
  const connection = mysql.createConnection(DB_CONFIG);

  connection.connect((err) => {
    if (err) {
      console.error('MySQL connection failed:', err.message);

      if (retries > 0) {
        console.log(`Retrying in ${delay / 1000} seconds... (${retries} attempts left)`);
        setTimeout(() => connectWithRetry(retries - 1, delay), delay);

      } else {
        console.error('Out of retries, exiting.');
        process.exit(1);

      }
      return;
    }

    console.log('✅ Connected to MySQL.');
    startServer(connection);
  });
}

/**
 * Initializes the database by creating the necessary tables if they don't exist
 * This includes 'users' and 'patients' tables used by the application
 * 
 * @param {mysql.Connection} connection - The MySQL connection instance
 */ 
function initializeDatabase(connection) {
  const queries = [
    `CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS patients (
      ID INT AUTO_INCREMENT PRIMARY KEY,
      Topic VARCHAR(255) NOT NULL,
      Data TEXT
    )`,
  ];

  queries.forEach((query) => {
    connection.query(query, (err) => {
      if (err) throw err;
    });
  });

  console.log('✅ Tables initialized.');

  /* Insert the user info into the 'users' table */
  DEFAULT_USERS.forEach(({ username, password }) => {
    connection.query(
      'INSERT IGNORE INTO users (username, password) VALUES (?, ?)',
      [username, password],
      (err) => {
        if (err) console.error(`❌ Failed to insert user ${username}:`, err.message);
      }
    );
  });

  console.log('✅ Default users inserted (if not already present).');
}

/**
 * Initializes and starts the Express server.
 * Sets up middleware for CORS & JSON parsing
 * Initializes the database tables
 * Defines routes for basic health check and login
 * 
 * @param {mysql.Connection} connection - Active MySQL connection used by route handlers
 */
function startServer(connection) {
  const app = express();

  app.use(cors());
  app.use(bodyParser.json());

  app.get('/', (_, res) => res.send('Welcome to MYSQL with Docker'));

  initializeDatabase(connection);

  /**
   * POST /login
   * Verifies if the provided username and password exist in the database table users
   * Responds with a success message or error status
   */ 
  app.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    connection.query(
      'SELECT * FROM users WHERE username = ? AND password = ?',
      [username, password],
      (err, results) => {
        if (err) return res.status(500).json({ error: 'Server error' });
        if (results.length > 0) return res.status(200).json({ message: 'Login successful' });
        return res.status(401).json({ error: 'Invalid username or password' });
      }
    );
  });

  app.listen(PORT, HOST, () => {
    console.log(`🚀 Server is running at http://${HOST}:${PORT}`);
  });
}

connectWithRetry();


