# Backend Server (Express + MySQL)

## Overview

This service exposes a REST API for an EMR prototype. It uses **Express** for HTTP routing and **mysql2** for database access. On boot it:

- Connects to MySQL (with retry logic).
- Ensures core tables exist (idempotent DDL).
- Seeds default users, patients, and doctors (insert‑ignore).
- Serves endpoints for authentication, patients, doctors, and appointments.

**Tech stack**
- **Express** for HTTP routing
- **mysql2** for DB access (callback + promise APIs)
- **cors** and **body-parser/json** for CORS and JSON parsing

---

## Startup & Configuration

- **Host:** `0.0.0.0`
- **Port:** `3002`
- **DB config:** in-file constants pointing at host `mysql1`, user `root`, password `admin`, db `emr_app_db`.
- **Retry:** `connectWithRetry(retries=10, delay=2000ms)` attempts DB connection repeatedly before exiting.

### Run
```bash
node backend/server.js
# or with nodemon if available
nodemon backend/server.js
```

### Health Check
```
GET /  → 200 OK  ("Welcome to MYSQL with Docker")
```

---

## Database Schema (DDL)

The server creates these tables if they do not yet exist:

```sql
-- users
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL
);

-- patients
CREATE TABLE IF NOT EXISTS patients (
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
);

-- doctors
CREATE TABLE IF NOT EXISTS doctors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL
);

-- appointments
CREATE TABLE IF NOT EXISTS appointments (
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
);
```

### Seed Data
- **Users:** `Admin/Admin1234`, `jsmith/smith1234`, `gpaul/paul1234`
- **Doctors:** `Dr. Wong`, `Dr. Smith`
- **Patients:** loaded from `backend/defaultPatients.js`

> Seeding uses `INSERT IGNORE` so reboots won’t duplicate rows.

---

## Middleware

- `cors()` — enables cross‑origin requests from the React frontend.
- `bodyParser.json()` — parses JSON bodies.

---

## Authentication

### POST `/login`
Verify username/password against `users` table.

**Body**
```json
{ "username": "Admin", "password": "Admin1234" }
```

**Responses**
- `200` `{ "message": "Login Successful" }`
- `400` `{ "error": "username and password required" }`
- `401` `{ "error": "Invalid username or password" }`
- `500` `{ "error": "Server error" }`

> Simple username/password check (no hashing) — suitable only for local dev/demo.

---

## Patients – Search & CRUD (subset)

### GET `/patients/search`
Flexible search across several modes via `?mode=`. Default mode: `search_name`.

**Query Params**
- `keyword` (required)
- `mode` one of:
  - `search_name`  
    - `"Last"` → `lastname LIKE 'Last%'` (prefix)  
    - `"Last, First"` → `lastname = 'Last' AND firstname LIKE 'First%'` (case-insensitive)
  - `search_phone` → matches in `homephone | cellphone | workphone`
  - `search_dob` → `dob LIKE`
  - `search_health_number` → `healthinsurance_number LIKE`
  - `search_email` → `email LIKE`
  - `search_address` → `address LIKE`

**Responses**
- `200` `[{ patient rows... }]`
- `400` `{ "error": "Keyword required" | "Invalid name format" | "Invalid search mode" }`
- `500` `{ "error": "Database error" }`

**Example**
```
GET /patients/search?mode=search_name&keyword=Smith
GET /patients/search?mode=search_name&keyword=Smith,%20Jo
GET /patients/search?mode=search_phone&keyword=416
```

### GET `/patients/:id`
Return one patient (field names mapped to UI aliases in response).

**Responses**
- `200` `{ id, lastname, firstname, ..., healthNumber, healthVersion, status, familyPhysician }`
- `400` `{ "error": "Patient ID required" }`
- `404` `{ "error": "Patient not found" }`
- `500` `{ "error": "Database error" }`

### PUT `/patients/:id`
Partial update. Only whitelisted fields are written.

**Body (example)**
```json
{
  "lastname": "Doe",
  "email": "jane@example.com",
  "patient_status": "active"
}
```

**Responses**
- `200` `{ "message": "Patient updated successfully" }`
- `400` `{ "error": "No valid fields to update" }`
- `404` `{ "error": "Patient not found" }`
- `500` `{ "error": "Database error" }`

### POST `/patients`
Create a patient from arbitrary provided fields (keys should match DB columns).

**Body (example)**
```json
{
  "firstname": "Jane",
  "lastname": "Doe",
  "province": "Ontario",
  "email": "jane@example.com",
  "dob": "1990-05-02",
  "patient_status": "active",
  "family_physician": "Dr. Wong"
}
```

**Responses**
- `201` `{ "message": "Patient added successfully", "id": <insertId> }`
- `500` `{ "error": "Failed to insert patient" }`

> If you see `500 Failed to insert patient`, check that your JSON body keys match **column names** in `patients` (e.g., `healthinsurance_number`, not `healthNumber`).

---

## Doctors

### GET `/doctors`
Returns the list of doctor names for dropdowns.

**Response**
- `200` `["Dr. Wong","Dr. Smith", ...]`
- `500` `{ "error": "Database error" }`

---

## Appointments

### POST `/appointments`
Create an appointment, with **overlap prevention** for `(provider_id, date, time, duration)`.

**Body**
```json
{
  "patientId": 1,
  "providerId": 1,
  "date": "2025-08-04",
  "time": "10:30",
  "duration": 15,
  "reason": "Follow-up",
  "status": "booked"
}
```

**Behavior**
- Computes start/end seconds from `time` and `duration`.
- Rejects if any existing appt overlaps:
  - `409 { "error": "Time slot already booked" }`

**Responses**
- `201` `{ "message": "Appointment added successfully" }`
- `409` `{ "error": "Time slot already booked" }`
- `500` `{ "error": "Database error" }`

### GET `/appointments`
List appointments for a given date (optionally filtered by provider).

**Query**
- `date` (required) – `YYYY-MM-DD`
- `providerId` (optional)

**Response** `200`
```json
[{
  "id": 10,
  "start_time": "10:30:00",
  "duration_minutes": 15,
  "reason": "Follow-up",
  "status": "booked",
  "patient_id": 1,
  "firstname": "Jane",
  "lastname": "Doe",
  "provider_name": "Dr. Smith"
}]
```

**Errors**
- `400` `{ "error": "Date is required" }`
- `500` `{ "error": "Database error" }`

### GET `/appointments/:id`
Return one appointment with joined patient/provider info.

**Responses**
- `200` `{ appointment + firstname, lastname, provider_name }`
- `404` `{ "error": "Not found" }`
- `500` `{ "error": "DB error" }`

### PUT `/appointments/:id`
Partial update of an appointment’s fields (`patient_id`, `provider_id`, `appointment_date`, `start_time`, `duration_minutes`, `reason`, `status`).

**Responses**
- `200` `{ "message": "Appointment updated successfully" }`
- `400` `{ "error": "Nothing to update" | "Appointment ID required" }`
- `404` `{ "error": "Appointment not found" }`
- `500` `{ "error": "Database error" }`

### PUT `/appointments/:id/status`
Shorthand to update **only** the `status` (must be one of: `booked|present|being_seen|finished|missed`).

**Body**
```json
{ "id": 123, "status": "present" }
```

**Responses**
- `200` `{ "message": "Appointment status updated successfuly" }`
- `400` `{ "error": "Status is required" | "Valid status is required" }`
- `500` `{ "error": "Database error" }`

### DELETE `/appointments/:id`
Delete one appointment by id.

**Responses**
- `200` `{ "message": "Appointment has been deleted sucessfully" }`
- `404` `{ "error": "Appointment not found" }`
- `500` `{ "error": "Database error" }`

---

