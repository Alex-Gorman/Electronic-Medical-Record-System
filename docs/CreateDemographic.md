# CreateDemographic – Component Documentation

## Overview

`CreateDemographic` is a React component that renders a **patient demographic creation form**. It loads the list of doctors from the backend, validates user input with HTML constraints, and submits a new patient record to the API.

> **Location in repo:** `frontend/src/CreateDemographic/CreateDemographic.js`

---

## External Endpoints Used

Base URL: `http://localhost:3002`

- `GET /doctors` — returns an array of doctor names for the *Family Physician* dropdown.
- `POST /patients` — creates a new patient using the submitted form data.

---

## Component Responsibilities

- Display a two-column form for patient demographics.
- Load and populate a **Family Physician** select from `/doctors`.
- Enforce input constraints with HTML attributes (e.g., `required`, `pattern`).
- Submit the data to `/patients` as JSON.
- Show a success message on completion.

---

## Effect Hooks
- `useEffect(() => fetch('/doctors'), [])` — loads doctor list on mount.

---

## Component State
- `formData: Record<string, string>` — accumulates all input values by `name` attribute.
- `doctors: string[]` — doctor names returned by `GET /doctors`.
- `successMessage: string` — shown after a successful submission.

---

## Fields & Validation

The form uses native HTML validation where possible. Below are the key fields and their constraints:

| Field (name)                      | Type     | Required | Pattern / Notes                                        | Example            |
|----------------------------------|----------|----------|--------------------------------------------------------|--------------------|
| `firstname`                      | text     | ✔        | `^[A-Z][a-z]*$` (capital first letter, letters only)  | `John`             |
| `lastname`                       | text     | ✔        | `^[A-Z][a-z]*$`                                       | `Smith`            |
| `preferredname`                  | text     | ✖        | letters only                                          | `Johnny`           |
| `address`                        | text     | ✖        | letters, digits and spaces                            | `123 Main St`      |
| `city`                           | text     | ✖        | letters and spaces                                    | `Toronto`          |
| `province`                       | select   | ✔        | must choose a value                                   | `Ontario`          |
| `postalcode`                     | text     | ✖        | `^[A-Za-z]\\d[A-Za-z] \\d[A-Za-z]\\d$` (A1A 1A1)      | `M5V 2T6`          |
| `homephone` / `workphone` / `cellphone` | tel | ✖ | `^\\d{10}$` (10 digits only)                          | `4165551234`       |
| `email`                          | email    | ✔        | HTML email validation                                 | `john@acme.com`    |
| `dob`                            | date     | ✔        | HTML date input                                       | `1980-05-15`       |
| `sex`                            | select   | ✖        | `M`, `F`, or `Other`                                  | `M`                |
| `healthinsurance_number`         | text     | ✖        | `^\\d{10}$` (exactly 10 digits)                       | `1234567890`       |
| `healthinsurance_version_code`   | text     | ✖        | `^[A-Z]{2}$` (two uppercase letters)                  | `AB`               |
| `patient_status`                 | select   | ✖        | `active` / `not enrolled`                             | `active`           |
| `family_physician`               | select   | ✔        | populated from `/doctors`                             | `Dr. Wong`         |

> **Tip:** Patterns are enforced by the browser; the backend should still validate to ensure data integrity.

---

## Submission Flow

1. User fills out the form; `onChange` updates `formData` by field `name`.
2. On **Submit**:
   - POST to `http://localhost:3002/patients` with `Content-Type: application/json`.
   - Shows `✅ Patient Created Successfully` on success.
   - Logs errors and alerts if the request fails.

### Request Payload (example)

```json
{
  "firstname": "John",
  "lastname": "Smith",
  "preferredname": "Johnny",
  "address": "123 Main St",
  "city": "Toronto",
  "province": "Ontario",
  "postalcode": "M5V 2T6",
  "homephone": "4165551111",
  "workphone": "4165552222",
  "cellphone": "4165553333",
  "email": "john.smith@example.com",
  "dob": "1980-05-15",
  "sex": "M",
  "healthinsurance_number": "1234567890",
  "healthinsurance_version_code": "AB",
  "patient_status": "active",
  "family_physician": "Dr. Wong"
}

---