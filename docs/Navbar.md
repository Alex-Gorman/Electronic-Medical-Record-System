# Navbar Component Documentation

## Overview

`Navbar` renders the top navigation bar for the EMR app. It shows a set of links on the left and utility links on the right. The current route is highlighted; the **Search** item is a special case that opens a popup window instead of navigating.

> **Location in repo**: `frontend/src/Navbar/Navbar.js`
> **Related styles:**: `frontend/src/Navbar/Navbar.css`

---

## Responsibilities

- Render primary navigation links.
- Highlight the active link based on the current URL (`useLocation().pathname`).
- Open **Patient Search** in a popup (`/search-popup`) to keep the main view intact.
- Provide utility links on the right: **Help** and **Log Out**.

---

## Links Rendered

Left-side items (default build):

- `/schedule` — **Schedule**
- `/caseload` — **Caseload**
- `/search` — **Search** *(opens popup to `/search-popup`)*
- `/report` — **Report**
- `/billing` — **Billing**
- `/inbox` — **Inbox**
- `/msg` — **Msg**
- `/consultations` — **Consultations**
- `/conreport` — **ConReport**
- `/preferences` — **Preferences**
- `/edoc` — **eDoc**
- `/tickler` — **Tickler**
- `/admin` — **Administration**

Right-side items:

- `/help` — **Help**
- `/` — **Log Out**

> **Note:** The visible label for **Search** is rendered as a `<button>` that calls `window.open('/search-popup', 'PatientSearch', 'width=1000,height=800')` rather than a `<Link>`.

---

## Behavior Details

### Active link highlighting
- For each left nav item, `isActive = location.pathname === item.to`.
- The `active` class is applied to the link/button when the path matches.

### Search popup
- The **Search** item is rendered as a `<button>`.
- On click, it prevents default navigation and opens a new window sized `1000 × 800` with the name `"PatientSearch"` and URL `/search-popup`.

### Right-side links
- **Help** navigates to `/help` (placeholder route by default).
- **Log Out** navigates to `/` (login page).

---




