# Main Menu Page Test Plan

1. Scope
- Rendering of Main Menu (fetch doctors, render column headers, show time cells)
- Status cycle 
- Message: appointment-deleted
- Message: appointment-added
- Date navigation

Out of scope
- Styling/CSS snapshot tests.
- Actual backend auth logic (we’ll mock fetch).
- Remember-me, tokens, storage (unless implemented in the component).

2. Test Environment
- Runner/Libs: Jest, @testing-library/react, @testing-library/user-event
- Router: MemoryRouter with initialEntries=["/MainMenu?date=YYYY-MM-DD"]
- Network: mock global.fetch

# Main Menu Page Test Cases

T1: Provider headers & boundary time cells
- Ensures doctors load from /doctors and that the scheduler displays time columns from 07:00 through 23:55. Uses findByText for the first header to resolve React act timing.


T2: Left time cell → Add popup (provider 1)
- Clicks a specific time in the left time column. Verifies window.open is invoked with:
    - mode=add
    - providerId=1
    - date=ISO
    - time URL‑encoded (e.g., 09%3A30)
    - Window title ADD APPOINTMENT and size 600x550


T3: Right time cell → Add popup (provider 2)
- Same as T2 but clicks the right column to assert providerId=2 and the chosen time (14:00).


T4: Clicking patient name → Edit popup
- Finds John Doe in the grid and clicks their name. Asserts the edit URL contains:
    - mode=edit
    - apptId=a1
    - date=ISO
    - time=10%3A00
    - A providerId that matches the column


T5: Status click cycles & issues PUT + refetch
- Targets Jane Roe whose status is present, clicks the status icon, and expects a PUT /appointments/a2/status with JSON { id: 'a2', status: 'being_seen' }. Then verifies a subsequent GET /appointments?date=ISO occurred.
- Uses fetchSpy to inspect all network calls and waitFor to allow the PUT to be recorded before asserting.


T6: appointment-deleted message removes row & refetches
- Sets up fetch so the first one or two /appointments calls return before data (including Amy Chan), and subsequent calls return after delete (Amy removed).
    - Renders at ?date=ISO.
    - await screen.findByText(/Amy Chan/) ensures Amy is on screen before dispatching the event.
    - Dispatches a MessageEvent('message', { data: { type: 'appointment-deleted', apptId: 'a3', date: ISO } }) inside await act(...) to ensure React flushes the state update.
    - Uses waitFor to assert that Amy is not in the document and that a refetch occurred.
    - Why act(...)? React must flush state updates triggered by event handlers/listeners during tests. Wrapping the window.dispatchEvent(...) avoids the common warning: “An update to MainMenu inside a test was not wrapped in act(...).”


T7: appointment-added message triggers refetch & shows new row
- Similar flip‑flop mock as T6: first /appointments returns before (no Bob), later returns after (with Bob White).
    - Assert Bob is not present.
    - Dispatch the appointment-added message inside await act(...).
    - findByText(/Bob White/) confirms the new appointment appeared.


T8: Date navigation updates URL & fetches next day
- Clicks the ► control. Asserts that LocationSpy shows ?date=2025-08-05 and that a fetch for that date was issued.