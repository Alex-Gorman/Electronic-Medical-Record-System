# MasterRecord Component Documentation

## Overview

`MasterRecord` is a React component that renders a patient’s **master (demographic) record**. It:

- Reads a `patientId` from the URL query string.
- Fetches the patient’s demographic record and the clinic’s doctor list.
- Displays read-only details or an editable form (toggle via **Edit** / **Save** / **Cancel**).
- Performs **client-side validation** on health number, version code, email, and postal code.
- Persists demographic updates via the backend API.
- Allows closing the window via **Exit Master Record**.

> **Location in repo:** `frontend/src/Components/MasterRecord.js`

---

## URL Parameters

| Parameter   | Type   | Required | Description                         | Example                 |
|-------------|--------|----------|-------------------------------------|-------------------------|
| `patientId` | string | Yes      | Database identifier for the patient | `/demographic?patientId=7` |

The component reads `patientId` from `useLocation().search` (query string).

---

## External Endpoints Used

Base URL: `http://localhost:3002`

- `GET /patients/:patientId` — fetch a single patient’s demographic record
- `PUT /patients/:patientId` — update patient demographic fields
- `GET /doctors` — fetch a list of clinic doctors (used by the **Family MD** dropdown)

> **Response shape assumptions:** The patient endpoint returns date of birth as an ISO timestamp; the component normalizes it to `YYYY-MM-DD` for inputs and display.

---

## Component State

| State              | Type                | Purpose |
|--------------------|---------------------|---------|
| `patient`          | `object \| null`    | The canonical demographic data fetched from the backend. |
| `error`            | `string \| null`    | Error message for load/save failures. |
| `isEditing`        | `boolean`           | Toggles the UI between read-only and edit mode. |
| `form`             | `object`            | A mutable copy of patient fields while editing. |
| `doctors`          | `string[]`          | List of doctor names for the **Family MD** select. |
| `fieldErrors`      | `Record<string,string>` | Per-field validation errors (health number, version, email, postal). |

## Derived values

- `age` — computed as `new Date().getFullYear() - new Date(patient.dob).getFullYear()`.
- `dob (normalized)` — trimmed to `YYYY-MM-DD` for inputs: `data.dob.slice(0, 10)`.

---

## Effect Hooks

1. **Fetch patient (on mount & when `patientId` changes)**  
   - Validates `patientId` presence.  
   - `GET /patients/:patientId` → stores payload in `patient` (and normalizes `dob`).  
   - On failure, sets `error`.

2. **Fetch doctors (on mount)**  
   - `GET /doctors` → stores an array of doctor names in `doctors`.  
   - On failure, sets `error`.

3. **Live field validation (whenever key `form` fields change)**  
   The component validates the following fields and writes messages into `fieldErrors`:
   - `healthNumber` — **exactly 10 digits** (`/^\d{10}$/`)
   - `healthVersion` — **exactly two uppercase letters** (`/^[A-Z]{2}$/`)
   - `email` — simple RFC-ish pattern (`/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/`)
   - `postalcode` — **Canadian** pattern `A1A 1A1` / `A1A1A1` (`/^[A-Za-z]\\d[A-Za-z][ ]?\\d[A-Za-z]\\d$/`)

---

## UI Structure

- **Sidebar:** Links to placeholders (Appt. History, Billing History, Prescriptions, E-Chart, etc.).
- **Header:** Patient’s name (UPPERCASE), age, and a **Next Appointment** placeholder.
- **Info Grid sections:**
  - **Demographic:** Last/First/Preferred name, Sex, DOB.
  - **Contact Information:** Phones, Address, City, Province, Postal Code, Email.
  - **Health Insurance:** Number (10-digit), Version Code (2 letters).
  - **Patient Clinic Status:** Family MD (dropdown), Patient Status.
- **Footer actions:**  
  - **Read-only:** *Exit Master Record*, *Edit*  
  - **Editing:** *Save*, *Cancel*

---

## Field Mapping (form → payload / DB columns)

| Form key           | Payload key / DB column             | Notes |
|--------------------|-------------------------------------|-------|
| `lastname`         | `lastname`                          | |
| `firstname`        | `firstname`                         | |
| `preferredname`    | `preferredname`                     | |
| `address`          | `address`                           | |
| `city`             | `city`                              | |
| `postalcode`       | `postalcode`                        | Validated as Canadian postal code. |
| `province`         | `province`                          | Select dropdown. |
| `homephone`        | `homephone`                         | |
| `workphone`        | `workphone`                         | |
| `cellphone`        | `cellphone`                         | |
| `email`            | `email`                             | Simple email regex validation. |
| `dob`              | `dob`                               | Sent as `YYYY-MM-DD`. |
| `sex`              | `sex`                               | |
| `healthNumber`     | `healthinsurance_number`            | Must be 10 digits. |
| `healthVersion`    | `healthinsurance_version_code`      | Must be 2 uppercase letters. |
| `status`           | `patient_status`                    | |
| `familyPhysician`  | `family_physician`                  | Select from `doctors`. |

---

## Event Handlers / Actions

### `handleExitMasterRecordButton(): void`  
Closes the window (`window.close()`).

### `handleChange(event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>): void`  
Updates the `form` object as the user types. It performs a shallow copy of the previous `form` and overwrites the changed field by `name`.

### `handleCancel(): void`  
Reverts the edit buffer by copying `patient` back into `form` and switches `isEditing` to `false`.

### `handleSave(): Promise<void>`  
Persists demographic changes to the backend. Flow:

1. If there are any `fieldErrors`, **do not save**.
2. Build a `payload` mapping from `form` keys to DB columns (see table below).
3. `PUT /patients/:patientId` with JSON body.
4. On success:
   - Optimistically sync local UI (`setPatient(form)`, `setIsEditing(false)`), **then**
   - Re-fetch the latest record with `GET /patients/:patientId` and set `patient` to the server’s source of truth.
5. On error: set a user-friendly message in `error`.

---

