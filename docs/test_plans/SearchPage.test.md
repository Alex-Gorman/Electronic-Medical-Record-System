# Search Page Test Plan

1. Scope
- Verify that SearchPage:
- Renders correctly (controls, placeholders, “No Results yet”).
- Builds the correct API request for each mode and handles success/empty/error states.
- Formats result fields (Name, Phone formatting, DOB truncation).
- Supports Enter-to-search and Create Demographic navigation.
- Never submits when the keyword is empty.
- Surfaces backend / network errors via alert().

Out of scope
- backend SQL behavior, cross-window integration, styling.

2. Test Environment
- Jest + @testing-library/react + @testing-library/user-event
- Render with MemoryRouter
- Mock:
    - global.fetch = jest.fn()
    - window.alert = jest.fn()
    - (For navigation test) either:
        - Wrap in <Routes> and assert the route changes, or
        - jest.mock('react-router-dom', () => ({ ...actual, useNavigate: () => navigateMock }))

3. Fixtures
Example success payload:
```
const rows = [
  {
    id: 1,
    lastname: 'Smith',
    firstname: 'John',
    dob: '1990-02-03',
    cellphone: '4161234567',
    email: 'john@ex.com',
    patient_status: 'active'
  }
];
```

---

# Search Page Test Matrix

| Test # | User Action                                    | Mock API Response                          | Expected Result                                                                                                                                                                |
|--------|------------------------------------------------|--------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| T1     | Initial Render                                 | n/a                                        | Title “Patient Search”, mode select default = Name, keyword input placeholder = Last, First, buttons: Search, Inactive, All, Create Demographic; text “No Results yet”.        |
| T2     | Change mode to Phone/DOB/Address/Health#/Email | n/a                                        | Placeholder updates to:  Phone → Enter phone number (e.g. 4161234567),  DOB → YYYY-MM-DD,  Address → Enter address,  Health# → Enter Health Insurance #,  Email → Enter email. |
| T3     | Success (name: last only)                      | 200 → rows                                 | fetch called with .../patients/search?keyword=Sm&mode=search_name . Table renders with 1 row; Name shows Smith, John.                                                          |
| T4     | Success (name: Last, First)                    | 200 → rows                                 | fetch URL uses encoded keyword (Smith,%20Jo) and mode=search_name.                                                                                                             |
| T5     | DOB truncation                                 | 200 → row with dob: '1990-02-03T00:00:00Z' | DOB cell shows 1990-02-03 (first 10 chars).                                                                                                                                    |
| T6     | No matches                                     | 200 → []                                   | Still shows “No Results yet” and no table.                                                                                                                                     |
| T7     | Backend 500                                    | 500 → { error: "Server error" }            | alert("Server error") called; results unchanged.                                                                                                                               |
| T8     | Create Demographic nav                         | n/a                                        | Navigates to /create-demographic (assert via useNavigate mock or ).                                                                                                            |
| T9     | Non-10-digit phone, Mode=Phone, 12345          | 200 → row with cellphone: "12345"          | Phone cell renders unchanged (12345).                                                                                                                                          |