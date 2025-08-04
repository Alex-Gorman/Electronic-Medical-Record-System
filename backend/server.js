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

/* Insert default doctors */
const defaultDoctors = [
  ['Dr. Wong'],
  ['Dr. Smith'],
];

const DEFAULT_PATIENTS = require('./defaultPatients');


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
    console.log('Connected to MySQL.');
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

  /* Tables to be created */
  const queries = [
    `CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS patients (
      id INT AUTO_INCREMENT PRIMARY KEY,
      lastname VARCHAR(100),
      firstname VARCHAR(100),
      preferredname VARCHAR(100),
      address TEXT,
      city VARCHAR(100),
      postalcode VARCHAR(20),
      province VARCHAR(100),
      homephone VARCHAR(20),
      workphone VARCHAR(20),
      cellphone VARCHAR(20),
      email VARCHAR(150),
      dob DATE,
      sex VARCHAR(10),
      healthinsurance_number VARCHAR(50),
      healthinsurance_version_code VARCHAR(10),
      patient_status ENUM('active', 'not enrolled') DEFAULT 'active',
      family_physician VARCHAR(150)
    )`,
    `CREATE TABLE IF NOT EXISTS doctors (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(150) NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS appointments (
      id SERIAL PRIMARY KEY,
      patient_id INT NOT NULL,
      provider_id INT NOT NULL,
      appointment_date DATE NOT NULL,
      start_time TIME NOT NULL,
      duration_minutes INT NOT NULL,
      reason TEXT,
      status ENUM('booked', 'present', 'being_seen', 'finished', 'missed') DEFAULT 'booked',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES patients(ID),
      FOREIGN KEY (provider_id) REFERENCES doctors(ID)
    )`
  ];



  /* For each query create the table if it doesn't exist */
  queries.forEach((query) => {
    connection.query(query, (err) => {
      if (err) throw err;
    });
  });
  console.log('Tables initialized.');



  /* Insert the default user info into the 'users' table */
  DEFAULT_USERS.forEach(({ username, password}) => {
    connection.query(
      'INSERT IGNORE INTO users (username, password) VALUES (?, ?)',
      [username, password],
      (err) => {
        if (err) console.error(`Failed to insert user ${username}:`, err.message);
      });
  });
  console.log('Default users inserted (if not already present).');



  /* Insert sample patient records into 'patients' table */
  DEFAULT_PATIENTS.forEach((patient) => {
    const fields = Object.keys(patient);
    const values = Object.values(patient);

    const placeholders = fields.map(() => '?').join(', ');
    const query = `INSERT IGNORE INTO patients (${fields.join(', ')}) VALUES (${placeholders})`;

    connection.query(query, values, (err) => {
      if (err) {
        console.error(`Failed to insert patient ${patient.firstname} ${patient.lastname}:`, err.message);
      }
    });
  });
  console.log('Default patients inserted (if not already present).');



  /* Insert default doctors into 'doctors' table */
  connection.query(
    'INSERT IGNORE INTO doctors (name) VALUES ?',
    [defaultDoctors],
    (err) => {
      if (err) {
        console.error('Failed to insert doctors:', err.message);
      } else {
        console.log('Default doctors inserted (if not already present).');
      }
    }
  );
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
   * Verifies if the user provided username & password exist the database table users
   * Responds with a success message or an error status
   */
   app.post('/login', (req, res) => {

    const username = req.body.username;
    const password = req.body.password;

    /* If no username or password, return error message */
    if (!username || !password) return res.status(400).json({ error: "username and password required" });

    /* SQL query */
    const query = 'SELECT * FROM users WHERE username = ? AND password = ?';

    params = [username, password];

    connection.query(query, params, (err, results) => {
      if (err) return res.status(500).json({ error: 'Server error' });
      if (results.length > 0) return res.status(200).json({ message: 'Login Successful' });
      return res.status(401).json({ error: 'Invalid username or password' });
    });
   }); 



  /**
   * GET /patients/search
   * Supports searching by full name: "Last, First" or just "Last"
   * Supports searching by phone number
   */
  app.get('/patients/search', (req, res) => {

    /* value to search */
    const keyword = req.query.keyword;

    /* search mode, default to search name if no mode given */
    const mode = req.query.mode || 'search_name';

    /* If no keyword given return error message */
    if (!keyword) return res.status(400).json({ error: 'Keyword required' });

    /* Where the SQL query will be stored */
    let query = '';

    /* Holds parameter values that will be safely inserted into the query */
    let params = [];

    /* Search by mode type */
    switch (mode) {
      case 'search_name': {

          /* Split "Smith, John" into parts */
          const parts = keyword.split(',').map(part => part.trim());

          /* Check to see if user entered "Lastname, Firstname" */
          if (parts.length == 2) {
            query = `
              SELECT * FROM patients
              WHERE lastname LIKE ? AND firstname LIKE ?
            `;
            params = [`%${parts[0]}`, `%${parts[1]}`];


          /* Otherwise check any name field */  
          } else {
            query = `
              SELECT * FROM patients
              WHERE lastname LIKE ? OR firstname LIKE ? OR preferredname
            `;
            params = [`%${keyword}`, `%${keyword}`, `%${keyword}`];
          }
          break;
      }

      case 'search_phone': {
        query = `
          SELECT * FROM patients
          WHERE homephone LIKE ? OR cellphone LIKE ? OR workphone LIKE ?
        `;

        params = [`%${keyword}`, `%${keyword}`, `%${keyword}`];
        break;
      }

      case 'search_dob': {
        query = `
        SELECT * FROM patients
        WHERE dob LIKE ?
        `;

        params = [`%${keyword}`];
        break;
      }

      case 'search_health_number': {
        query = `
        SELECT * FROM patients
        WHERE healthinsurance_number LIKE ?
        `;
        params = [`%${keyword}`];
        break;
      }

      case 'search_email': {
        query = `
        SELECT * FROM patients 
        WHERE email LIKE ?
        `;
        params = [`%${keyword}`];
        break;
      }

      case 'search_address': {
        query = `
        SELECT * FROM patients
        WHERE address LIKE ?
        `;
        params = [`%${keyword}`];
        break;
      }

      default:
        return res.status(400).json({error: "Invalid search mode"});
    }

    connection.query(query, params, (err, results) => {
      if (err) return res.status(400).json({ error: 'Database error'});
      res.json(results);
    });
  });



  /**
   * GET /doctors
   * Supports retrieving all the doctors names in the doctors table
   */
  app.get('/doctors', (req, res) => {

    /* SQL query */
    const query = 'SELECT name FROM doctors';

    connection.query(query, (err, results) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      const doctorNames = results.map((row) => row.name);
      res.json(doctorNames);
    });
  });



  /**
   * POST /patients
   * Inserts a new patient record into the patients table
   */ 
  app.post('/patients', (req, res) => {

    /* Patient info to be stored */
    const patient = req.body;

    /* An array of all the field names from the patient object */
    const fields = Object.keys(patient);

    /* An array of all the corresponding values from the patient object */
    const values = Object.values(patient);

    /* Placeholders for the parameterized SQL Query */
    const placeholders = fields.map(() => '?').join(', ');

    /* SQL Query to insert the patient values into the patients table */
    const query = `INSERT INTO patients (${fields.join(', ')}) VALUES (${placeholders})`;

    connection.query(query, (err, results) => {
      if (err) {
        console.error('Failed to insert patient:', err.message);
        return res.status(500).json({ error: 'Failed to insert patient:' });
      }
      res.status(201).json({ message: 'Patient added successfully', id: result.insertId});
    });
  });

  /**
   * POST /appointments
   * Inserts booked appointment details form the frontend into the appointments table
   */
  app.post('/appointments', (req, res) => {
    const { patientId, providerId, date, time, duration, reason, status } = req.body;

    /* SQL Query to insert the appointment info into the appointments table */
    const query = `INSERT INTO appointments
      (patient_id, provider_id, appointment_date, start_time, duration_minutes, reason, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)`;  

    values = [patientId, providerId, date, time, duration, reason, status || 'booked'];

    connection.query(query, values, (err, results) => {
      if (err) {
        console.error('Failed to insert appointment info:', err.message);
        return res.status(500).json({ error: 'Failed to insert appointment'});
      }
      res.status(201).json({ message: 'Appointment added successfully'});
    });

  });

  /**
   * GET /appointments
   * Returns all appointments for a given date
   */
  app.get('/appointments', (req, res) => {
    const { date } = req.query;

    if (!date) return res.status(400).json({ error: 'Date is required' });

    const query = `
      SELECT
        a.id, a.start_time, a.duration_minutes, a.reason, a.status, a.patient_id,
        p.firstname, p.lastname,
        d.name as provider_name
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      JOIN doctors d ON a.provider_id = d.id
      WHERE appointment_date = ?
      `;
    
    connection.query(query, [date], (err, results) => {
      if (err) {
        console.error('Failed to fetch appointments:', err.message);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(results);
    });
      
  });

  /**
   * PUT /appointments/:id/status
   * Updates the status of an appointment
   */
  app.put('/appointments/:id/status', (req, res) => {
    
    const id = req.body.id;
    const status = req.body.status;

    if (!status) return res.status(400).json({ error: "Status is required "});

    const validStatuses = ['booked', 'present', 'being_seen', 'finished', 'missed'];

    if (!validStatuses.includes(status)) return res.status(400).json({ error: "Valid status is required "});

    const query = `UPDATE appointments SET status = ? WHERE id = ?`;

    connection.query(query, [status, id], (err, results) => {
      if (err) {
        console.error('Failed to update appointment status', err.message);
        return res.status(500).json({ error: 'Database error'});
      }

      res.status(200).json({message: "Appointment status updated successfuly"});
    })
  });

  /**
   * DELETE /appointments/:id
   * Deletes an appt with the given appt id
   */
  app.delete('/appointments/:id', (req, res) => {
    const apptId = req.params.id;

    if (!apptId) return res.status(400).json({ error: "Appt id is required "});

    const query = `DELETE FROM appointments WHERE id = ?`;

    connection.query(query, [apptId], (err, results) => {
      if (err) {
        console.error('Failed to delete appointment', err.message);
        return res.status(500).json({ error: 'Database error' });
      }

      if (results.affectedRows === 0) {
        return res.status(404).json({ error: 'Appointment not found'});
      }

      res.status(200).json({message: "Appointment has been deleted sucessfully"});
    });
  });


  /**
   * PUT /appointments/:id
   * Updates an existing appointment (reason, duration, time, etc.)
   */
  app.put('/appointments/:id', (req, res) => {
    const apptId = req.params.id;
    const {
      patientId,
      providerId,
      date,
      time,
      duration,
      reason,
      status
    } = req.body;

    if (!apptId) return res.status(400).json({ error: 'Appointment ID required' });

    /* Build the fields dynamically, so partials can be pateched if wanted */
    const fields = [];
    const values = [];

    if (patientId !== undefined) {
      fields.push('patient_id = ?');
      values.push(patientId);
    }
    if (providerId !== undefined) {
      fields.push('provider_id = ?');
      values.push(providerId);
    }
    if (date !== undefined) {
      fields.push('appointment_date = ?');
      values.push(date);
    }
    if (time !== undefined) {
      fields.push('start_time = ?');
      values.push(time);
    }
    if (duration !== undefined) {
      fields.push('duration_minutes = ?');
      values.push(duration);
    }
    if (reason !== undefined) {
      fields.push('reason = ?');
      values.push(reason);
    }
    if (status !== undefined) {
      fields.push('status = ?');
      values.push(status);
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'Nothing to update' });
    }

    const query = `UPDATE appointments SET ${fields.join(', ')} WHERE id = ?`;
    values.push(apptId);

    connection.query(query, values, (err, results) => {
      if (err) {
        console.error('Failed to update appointment:', err.message);
        return res.status(500).json({ error: 'Database error' });
      }
      if (results.affectedRows === 0) {
        return res.status(404).json({ error: 'Appointment not found' });
      }
      res.status(200).json({ message: 'Appointment updated successfully' });
    });
  });



  app.listen(PORT, HOST, () => {
    console.log(`🚀 Server is running at http://${HOST}:${PORT}`);
  });
}

connectWithRetry();


