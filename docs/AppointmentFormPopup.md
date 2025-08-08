# AppointmentFormPopup Component Documentation

## Overview

`AppointmentFormPopup` is a React component that renders a popup window for creating or editing appointments. It handles:

- Parses URL query params (`time`, `providerId`, `apptId`, `mode`, `date`).
- Loads an existing appointment in *edit* mode.
- Lets the user set start time, duration, patient, reason, and status (date is read‑only in this popup).
- Checks for double‑booking against the backend for the same **date** + **provider**.
- Creates or updates the appointment via the REST API.
- Deletes appointments and notifies the opener window to update the day view.

> **Location in repo**: `frontend/src/Components/AppointmentFormPopup.js`
> **Related styles:** `frontend/src/Components.AppointmentFormPopup.css`

---

## URL Parameters

| Parameter    | Type   | Required | Description                               | Example      | Notes                    |
| ------------ | ------ | -------- | ----------------------------------------- | ------------ | ------------------------ |
| `time`       | string | Yes      | Initial appointment start time (`HH:MM`). | `10:25`      | Initial `HH:MM`.         |
| `providerId` | string | Yes      | ID of the provider for this appointment.  | `1`          | Provider/doctor id.      |
| `apptId`     | string | No       | Appointment ID when editing.              | `42`         | Needed when `mode=edit`. | 
| `mode`       | string | Yes      | Either `add` or `edit`.                   | `add`/`edit` | Controls form behaviour. |
| `date`       | string | Yes      | Appointment date in `YYYY-MM-DD` format.  | `2025-08-04` | ISO date for the day.    |

---

## Usage Example
```jsx
/* To add an appointment: */
window.open(
  '/appointment-form-popup?mode=add&providerId=1&date=2025-08-04&time=10:00',
  'Add Appointment',
  'width=600,height=550'
);

/* To edit an appointment: */
window.open(
  '/appointment-form-popup?mode=edit&providerId=1&apptId=10&date=2025-08-04&time=10:25',
  'Edit Appointment',
  'width=600,height=550'
);
```

---

## External Endpoints Used
Base URL: `http://localhost:3002`
- `GET /appointments?date=YYYY-MM-DD&providerId=<id>` → list of existing appointments for conflict checks
- `GET /appointments/:id` → load existing appt (edit mode)
- `POST /appointments` → create new appt
- `PUT /appointments/:id` → update appt
- `DELETE /appointments/:id` → delete appt
- `GET /patients/search?keyword=<q>&mode=search_name` → patient search
All endpoints are called at `http://localhost:3002`.

---

### Props and Hooks

- **URL Parsing**: Uses React Router’s `useLocation()` and the browser’s `URLSearchParams` API to extract query parameters (`time`, `providerId`, `apptId`, `mode`, `date`).
- **State Hooks** (`useState`):
    - `viewMode` (`"form" | "search"`) — toggles between form entry and patient search view.
    - `selectedPatient` (object|null) — stores the chosen patient for the appointment.
    - `appointmentStatus` (string) — backend status values like `booked`, `present`, etc.
    - `startTime` (string `HH:MM`) — the appointment’s start time field.
    - `durationString` (string) — text input for duration in minutes.
    - `appointmentReason` (string) — free‐text field for appointment reason.
    - `searchResults` (array) — holds patient search results from the backend.
    - `nameInput` (string) – search box input.
- **Effect Hooks** (`useEffect`):
    - Fetches and populates existing appointment data when `mode === 'edit'` and a valid `apptId` is present.
    - Updates the browser `document.title` to “ADD APPOINTMENT” or “EDIT APPOINTMENT” based on the `mode` parameter.

## Derived Values
- `currentDate: Date` – derived from `date` param (fallback `new Date()`).
- `isoDate: string` – `currentDate.toISOString().slice(0, 10)`.

---

## Helper Functions
- `roundToNearestFive(timeStr: string): string`\
  Rounds a `HH:MM` string to the nearest 5-minute interval.
- `checkIfTimeConflict(appt, durationNum, selectedTimeRawMinutes): boolean`\
  Given an existing `appt` (with `start_time`, `duration_minutes`), requested `durationNum`, and the requested start in minutes, returns `true` if intervals overlap.
> Overlap logic uses half‑open intervals:
>
> - Requested: `[newStart, newEnd)`
> - Existing:  `[existingStart, existingEnd)`

---

## Event Handlers / Actions

### `handleCancel(): void`
Closes the popup (`window.close()`).

### `handleSearch(e: KeyboardEvent): Promise<void>`
On **Enter**, queries `/patients/search` using the `nameInput`, sets `searchResults`, and switches to `viewMode="search"`.

### `handleDeleteAppointment(): Promise<void>`
Calls `DELETE /appointments/:id`; on success, posts a message to the opener and closes:
```js
window.opener?.postMessage({
  type: 'appointment-deleted',
  apptId,        // deleted id
  date: isoDate, // YYYY-MM-DD string
}, '*');
```

### `handleBookAppointmentPopup(): Promise<void>`
Main booking flow:
1. Validate required fields (`selectedPatient`, `time`).
2. Fetch `freshAppointments` via `GET /appointments?date=…&providerId=…`.
3. Round `startTime` to nearest 5; compute `selectedTimeRawMinutes`.
4. Loop through `freshAppointments` and call `checkIfTimeConflict` (skip the same `apptId` when editing).
5. If conflict → alert + abort.
6. Build `appointmentData` and call:
   - `POST /appointments` (add), or
   - `PUT /appointments/:id` (edit).
7. On success, `postMessage({ type: 'appointment-added', apptId, date: isoDate })` to opener and close.

---

## Fields & UI Binding
- **Date** (`input[type=date]`) – bound to `isoDate` (disabled in popup).
- **Start Time** (`input[type=time]`) – bound to `startTime` (`step=300`).
- **Duration** (`input[type=number]`) – bound to `durationString`; sanitized to digits; min 5, step 5.
- **Name** (`input[type=text]`) – search input; displays selected patient full name when chosen.
- **Reason** (`textarea`) – bound to `appointmentReason`.
- **Status** (`select`) – shows UI labels mapped to backend values.
- **Doctor** (`input[disabled]`) – displays `providerId`.

---

## Conflict Detection Details
- Fetches appointments **already filtered** by date and provider.
- For each existing appointment:
  - `existingStart = minutes(appt.start_time.slice(0, 5))`
  - `existingEnd   = existingStart + appt.duration_minutes`
  - `requestedStart = minutes(roundedStartTime)`
  - `requestedEnd   = requestedStart + durationNum`
  - Conflict if `(newAppointmentStart >= currentBookedAppointmentStart) && (newAppointmentStart <= currentBookedAppointmentEnd)`.
  - Conflict if `(newAppointmentEnd >= currentBookedAppointmentStart) && (newAppointmentEnd <= currentBookedAppointmentEnd)`.
  - Conflict if `(newAppointmentStart < currentBookedAppointmentStart) && (newAppointmentEnd > currentBookedAppointmentEnd)`.
  - Conflict if `(newAppointmentStart > currentBookedAppointmentStart) && (newAppointmentEnd < currentBookedAppointmentEnd)`.
- When editing, skip the appointment whose `id` equals `apptId`.

---






*End of full documentation for **`AppointmentFormPopup`**.*