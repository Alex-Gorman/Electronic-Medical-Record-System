# CalendarPopup Component Documentation

## Overview

`CalendarPopup` is a lightweight React component that renders an inline calendar (via **react-datepicker**) inside a popup window. When the user selects a date, it sends a `postMessage` to the **opener** window and then closes itself.

- **Emits:** `{ type: 'date-selected', date: 'YYYY-MM-DD' }`
- **Closes itself** after a date is chosen
- **No backend calls** — purely a UI helper

> **Location in repo:** `frontend/src/Components/CalendarPopup.js`

---

## Dependencies

- `react-datepicker` (and its stylesheet)
  ```js
  import DatePicker from 'react-datepicker';
  import 'react-datepicker/dist/react-datepicker.css';
  ```

---

## Message Contract

When a date is chosen, the popup sends a cross-window message back to its opener:

```js
window.opener?.postMessage(
  { type: 'date-selected', date: 'YYYY-MM-DD' },
  '*'
);
```

- `type`: Fixed string `"date-selected"`.
- `date`: ISO-like date string formatted as `YYYY-MM-DD` (e.g., `"2025-08-18"`).

> The opener should validate the `origin` in production. In dev, `'*'` is acceptable, but be more restrictive when deploying.

---

## Props & Hooks

This component is intentionally minimal and **does not accept props**. Internal state & hooks:

- `date : Date` — the currently highlighted date in the picker (initialized to `new Date()`).
- `setDate(Date)` — state setter for `date`.
- No external context/state required.

---

## UI Details

- Renders **inline** `DatePicker` (no input field) for a simple, one-click selection.
- After selection, it immediately posts the message and closes the popup.
- Basic container padding and a simple heading.

---