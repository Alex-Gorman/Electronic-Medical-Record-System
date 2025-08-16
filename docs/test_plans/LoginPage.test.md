# Login Page Test Plan

1. Scope
- In scope
- Rendering of login form (username, password, submit).
- Client-side validation (required fields).
- Submit flows (click and Enter key).
- Handling API success/failure.
- Loading state (button disabled/spinner).
- Navigation to /MainMenu on success.
- Error display reset when user edits inputs.

Out of scope
- Styling/CSS snapshot tests.
- Actual backend auth logic (we’ll mock fetch).
- Remember-me, tokens, storage (unless implemented in the component).

2. Test Environment
- Runner/Libs: Jest, @testing-library/react, @testing-library/user-event
- Router: MemoryRouter with initialEntries=["/demographic?patientId=1"]
- Network: mock global.fetch

# Login Page Test Matrix

| Test # | User Action                              | Mock API Response                             | Expected Result                                               |
|--------|------------------------------------------|-----------------------------------------------|---------------------------------------------------------------|
| T1     | None                                     | n/a                                           | Username & Password inputs and login button visible           |
| T2     | Click login with both input fields empty | n/a                                           | Shows "Username & Password required"                          |
| T3     | Fill password only → click Login         | n/a                                           | Blocks submit, shows username required.                       |
| T4     | Fill username only → click Login         | n/a                                           | Blocks submit, shows password required.                       |
| T5     | Enter valid creds → click Login          | 200 { message: "Login Successful" }           | Button disabled during submit; navigate to  /MainMenu         |
| T6     | Enter wrong creds → click Login          | 401 { error: "Invalid username or passowrd" } | Shows error text, "Invalid username or password"; stays on  / |
| T7     | Enter creds → click Login                | 500 { error: "Server error" }                 | Shows generic error (“Failed to login”); stays on  /          |
| T8     | Inspect password input                   | n/a                                           | Password field has type="password"                            |