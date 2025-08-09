# LoginPage – Component Documentation

## Overview
`LoginPage` renders the login interface for the EMR portal. It validates input, submits credentials to the backend, handles error states, and on success redirects the user to the main menu.

> **Location in repo:** `frontend/src/LoginPage/LoginPage.js`

---

## Event Handlers / Actions

### `handleSubmit(e: FormEvent): Promise<void>`
- Prevents default form submit.
- Resets and recomputes validation errors.
- Calls `POST /login` with `{ username, password }`.
- Navigates to `/MainMenu` on success; otherwise sets `errors.login`.

---

## Validation Rules
- Username: must be a non-empty string (`trim()`).
- Password: must be a non-empty string (`trim()`).
- If either field is empty, the form does not submit and inline errors are shown.

---

## User Flows
1. **Submit credentials**
   - On `Submit`, validate inputs. If invalid → show inline errors.
   - If valid, send `POST /login` with JSON body.
   - If `response.ok` → navigate to `/MainMenu`.
   - Else → set `errors.login` to an appropriate message.

2. **Network/server failure**
   - Show “Server error. Please try again later.”

---

## API Endpoints
- **POST** `http://localhost:3002/login`
  - **Body (JSON):**
    ```json
    { "username": "string", "password": "string" }
    ```
  - **Success:** `200 OK` (any JSON); UI navigates to `/MainMenu`
  - **Failure:** `401/403/400` → “Invalid username or password”
  - **Network/Server error:** “Server error. Please try again later.”

> If your backend returns `204 No Content` on success, do not call `response.json()`—this component only checks `response.ok`.

---

