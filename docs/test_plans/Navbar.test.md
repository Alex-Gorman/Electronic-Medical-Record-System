# Navbar Test Plan

1. Scope

In scope:
- Rendering of all left/right nav items
- Active state based on `location.pathname`
- Special handling of **Search** (opens popup via `window.open`)
- Navigation for standard links (e.g., Billing, Help, Log Out)

Out of scope:
- Visual styling (CSS details)
- Backend/API calls
- Pages routed *to* (their own tests cover them)

2. Test Environment
- Runner/Libs: Jest, @testing-library/react, @testing-library/user-event
- Router: MemoryRouter with initialEntries=["/demographic?patientId=1"]
- Network: mock global.fetch

# Navbar Test Plan

1. Render: full menu present
- Verify all expected left-side items render (Schedule, Caseload, Search, … Admin).
- Verify right-side items render (Help, Log Out).
- Verify Search is rendered as a button, not a link.

2. Active state: highlight correct item
- For a set of paths (e.g., /billing, /schedule, /preferences), assert only the matching item has .active.
- When path is /search, the Search button should carry .active.

3. Search popup behavior
- Clicking Search calls window.open('/search-popup', 'PatientSearch', 'width=1000,height=800').
- Clicking Search does not push a new route.

4. Standard link navigation
- Clicking a normal link (e.g., Billing) changes the location to /billing.
- Clicking Help navigates to /help.
- Clicking Log Out navigates to /.

5. No unexpected links
- There is no <a href="/search">Search</a>; Search is a <button>.




