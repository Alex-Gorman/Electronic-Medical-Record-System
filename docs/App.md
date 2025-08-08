# App – Application Routing & Shell

## Overview

`App` is the root of the React application. It sets up **client‑side routing** with React Router and conditionally renders the global **Navbar** depending on the current route. The actual route logic lives in the internal `AppWrapper` component.

The Navbar is **hidden** on popup‑style pages and on the login screen.

> **Location in repo:** `frontend/src/App.js`

---

## Route Map

| Path                      | Component                | Notes                                 |
|---------------------------|--------------------------|---------------------------------------|
| `/`                       | `LoginPage`              | Login screen (Navbar hidden)          |
| `/MainMenu`               | `MainMenu`               | Primary day/appointments view         |
| `/search-popup`           | `SearchPage`             | Popup‑style patient search            |
| `/create-demographic`     | `CreateDemographic`      | Popup‑style create form               |
| `/appointment-form-popup` | `AppointmentFormPopup`   | Popup‑style create/edit appointment   |
| `/calendar-popup`         | `CalendarPopup`          | Popup‑style calendar                  |
| `/demographic`            | `MasterRecord`           | Patient master/demographic record     |
| `/casemgmt`               | _(placeholder)_          | Reserved for case management module   |
| `/billing`                | _(placeholder)_          | Reserved for billing module           |
| `/Rx`                     | _(placeholder)_          | Reserved for prescriptions module     |

---

## Navbar Visibility Rules

The Navbar is **not** rendered for the following paths:

```js
const HIDE_NAVBAR_ROUTES = [
  '/',
  '/search-popup',
  '/create-demographic',
  '/appointment-form-popup',
  '/casemgmt',
  '/billing',
  '/demographic',
  '/Rx',
  '/calendar-popup',
];
```