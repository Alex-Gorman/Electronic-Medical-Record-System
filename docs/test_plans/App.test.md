# App Test Plan

1. Scope

Validate that:
- Client-side routes render the correct page component.
- The global **Navbar** renders **only** on routes **not** listed in `HIDE_NAVBAR_ROUTES`.
- Popup-style routes render **without** the Navbar.
- Basic routing works with React Router (no broken paths).

Out of scope:
- Internal page logic of each route (tested by their own specs).
- Network requests and backend integration.
- Accessibility audits (can be added later).

2. Test Environment
- Runner/Libs: Jest, @testing-library/react, @testing-library/user-event
- Router: MemoryRouter with initialEntries=["/demographic?patientId=1"]
- Network: mock global.fetch

3. Navbar Visibility Rules
`HIDE_NAVBAR_ROUTES` in `App.js`:
```
/
/search-popup
/create-demographic
/appointment-form-popup
/casemgmt
/billing
/demographic
/Rx
/calendar-popup
```

---

# App Test Matrix

| #  | Path                         | Expected Component     | Navbar Visible?  |
| -- | ---------------------------- | ---------------------- | ---------------- |
| 1  | `/`                          | `LoginPage`            | **No**           |
| 2  | `/MainMenu`                  | `MainMenu`             | **Yes**          |
| 3  | `/search-popup`              | `SearchPage`           | **No**           |
| 4  | `/create-demographic`        | `CreateDemographic`    | **No**           |
| 5  | `/appointment-form-popup`    | `AppointmentFormPopup` | **No**           |
| 6  | `/demographic`               | `CalendarPopup`        | **No**           |
| 7  | `/demographic?patientId=123` | `MasterRecord`         | **No**           |
| 8  | `SearchPage.js`              | `MasterRecord`         | **No**           |

# App Test Cases
1. Root route renders Login and hides Navbar
- Go to /
- Assert LoginPage is present
- Assert Navbar not present

2. MainMenu route renders and shows Navbar
- Go to /MainMenu
- Assert MainMenu present
- Assert Navbar present

3. Popup routes hide Navbar (parameterized over: /search-popup, /create-demographic, /appointment-form-popup, /calendar-popup)
- For each path:
- Assert corresponding component present
- Assert Navbar not present

4. MasterRecord route hides Navbar (with and without params)
- Go to /demographic
- Assert MasterRecord present, Navbar not present
- Go to /demographic?patientId=1
- Assert MasterRecord present, Navbar not present






