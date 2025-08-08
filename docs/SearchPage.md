# SearchPage Component Documentation

## Overview

`SearchPage` is a React view for finding patients by a variety of fields, with a focus on **name-based** lookups. It:

- Lets users search by **Last** or **Last, First** (e.g., `Smith` or `Smith, John`).
- Supports additional modes: phone, DOB, address, health insurance #, email.
- Sends the query to the backend and renders a results table.
- Provides a “Create Demographic” shortcut to start a new patient record.

> **Location in repo:** `frontend/src/SearchPage.js`  
> **Related styles:** `frontend/src/SearchPage.css`

---

## External Endpoints Used
Base URL: `http://localhost:3002`
- `GET /patients/search?keyword=<q>&mode=<mode>`
  - `mode` is one of: `search_name`, `search_phone`, `search_dob`, `search_address`, `search_health_number`, `search_email`
  - Response: `Array<PatientRow>`

**Expected response fields (per row):**
- `id` (number)
- `firstname` (string)
- `lastname` (string)
- `dob` (ISO date string, optional)
- `email` (string, optional)
- `patient_status` (string, optional)
- `homephone` / `cellphone` / `workphone` (string, optional)

> The backend implements:
> - Last-only search: `keyword="Smi"` matches last names starting with “Smi”.
> - Last, First search: `keyword="Smith, Jo"` filters **lastname starts with “Smith”** and **firstname starts with “Jo”**.

---

## Search Modes & Expected Input

| Mode                    | Placeholder                    | Input Format / Notes                             |
|-------------------------|--------------------------------|--------------------------------------------------|
| `search_name`           | `Last, First`                  | `Last` or `Last, First` (comma + optional first) |
| `search_phone`          | `Enter phone number …`         | Any digits; the UI formats to `XXX-XXX-XXXX`     |
| `search_dob`            | `YYYY-MM-DD`                   | Prefix match supported (e.g., `2000-05`)         |
| `search_address`        | `Enter address`                | Free text                                        |
| `search_health_number`  | `Enter Health Insurance #`     | Free text/number                                 |
| `search_email`          | `Enter email`                  | Free text/partial                                |


---

## Component State

- `keyword: string` – current query text
- `searchMode: string` – one of the modes above (default `search_name`)
- `results: any[]` – array of patient rows returned by the backend

---

## Helper Functions

### `formatPhone(number: string): string`
- Formats a 10-digit string as `XXX-XXX-XXXX`; otherwise returns input unchanged.

### `getPlaceholder(): string`
- Returns the correct placeholder per `searchMode` (see table above).

---

## Event Handlers / Actions

### `handleSubmit(e): Promise<void>`
- Prevents default form submit.
- Calls `GET /patients/search?keyword=<keyword>&mode=<searchMode>`.
- Parses JSON; on success sets `results`.

### `handleCreateClick(): void`
- Navigates to `/create-demographic` to register a new patient.

---

## UI & Binding

- **Mode select** (`<select>`) → `searchMode`
- **Keyword input** (`<input type="text">`) → `keyword`
- **Search button** → triggers `handleSubmit`
- **Create Demographic** button → triggers `handleCreateClick`
- **Results table** shows:
  - **Name**: `lastname, firstname`
  - **Phone**: formatted from `cellphone || homephone || workphone`
  - **DOB**: `dob.slice(0, 10)` if present
  - **Email**
  - **Status**: `patient_status`
> When there are no matches, the page displays a simple “No Results yet”.

---

## Behavior Details (Name Search)

- **Last only**: typing `A` returns last names that start with **A**.  
  Typing `Ab` narrows to last names that start with **Ab**.
- **Last, First**: typing `Smith, J` returns rows with **lastname starts with “Smith”** and **firstname starts with “J”**.  
  This is done by splitting on the comma and applying `LIKE 'Smith%'` and `LIKE 'J%'`.

---

## Example Calls

```http
GET /patients/search?keyword=Sm&mode=search_name
GET /patients/search?keyword=Smith,%20Jo&mode=search_name
GET /patients/search?keyword=4161234567&mode=search_phone
GET /patients/search?keyword=2000-05&mode=search_dob
GET /patients/search?keyword=gmail.com&mode=search_email
```