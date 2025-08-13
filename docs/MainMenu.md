# MainMenu – Component Documentation

## Overview

`MainMenu` renders the **daily schedule view** and top navigation for the EMR. It:

- Manages the **current day** via a `?date=YYYY-MM-DD` query param (local date, no UTC drift).
- Fetches **appointments** and **doctors** for that day.
- Renders a two–provider **5-minute grid** from **07:00–23:55** with row-spanned cells for booked slots.
- Opens popups for **add/edit appointment**, **Master Record**, **E-Chart**, **Billing**, and **Rx**.
- Listens for `postMessage` events from popups to **incrementally update** the schedule.

> **Location**: `frontend/src/MainMenu/MainMenu.js`
> **Related styles:** `frontend/src/MainMenu/MainMenu.css`

---

## Endpoints Used (base: `http://localhost:3002`)

- `GET /doctors` → provider names (used in table header)
- `GET /appointments?date=YYYY-MM-DD` → day’s appointments (optionally narrowed by `providerId`)
- `PUT /appointments/:id/status` → cycle status (`booked` → `present` → `being_seen` → `finished` → `missed` → …)

The appointment popup itself handles `POST /appointments`, `PUT /appointments/:id`, and `DELETE /appointments/:id`.

---

## URL & Date Handling
- Reads the date from query string: `?date=YYYY-MM-DD`.
- Parses locally to avoid timezone shifts:
  ```js
  const [y, m, d] = dateParam.split('-').map(Number);
  new Date(y, m - 1, d);
  ```
- Whenever currentDate changes, it replaces the URL (no extra history entry) and refetches:
```
useEffect(() => {
  const iso = currentDate.toLocaleDateString('en-CA').slice(0, 10);
  navigate(`?date=${iso}`, { replace: true });
  setShowCalendar(false);
  fetchAppointments();
}, [currentDate, navigate]);
```

---

## Cross-Window Messaging
The popup notifies the day view to update without a full reload:
- Create: { type: 'appointment-added', date: 'YYYY-MM-DD' }
- Delete: { type: 'appointment-deleted', apptId: number, date: 'YYYY-MM-DD' }

---

## Rendering the Grid (5-minute rows + rowSpan)
The table has four columns:

| Col |	Header    | Content                          |
|-----|-----------|----------------------------------|
| 1	  | Time      | Clickable time for Provider 1    |
| 2	  | Dr. Wong  | Appointment cell (or empty slot) |
| 3	  | Time      | Clickable time for Provider 2    | 
| 4	  | Dr. Smith | Appointment cell (or empty slot) |

Key ideas in generateTimeRows():
- 1. **Minute key helper** (prevents edge cases at hour boundaries)
- 2. **Hidden row tracking per provider** so that follow-up 5-minute rows under a spanning cell aren’t rendered as extra cells
- 3. **Compute rowSpan defensively** (ceil to cover partials, min 1)
- 4. Render the single ```<td rowSpan={spanLength}>``` for the appointment only at the start minute; later rows are skipped because their time keys are in ```hiddenProviderXRows```

---



