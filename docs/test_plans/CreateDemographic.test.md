# CreateDemographic Component - Test Plan

- Component: ```frontend/src/CreateDemographic/CreateDemographic.js```
- Purpose: Ensure the “Create Demographic” form correctly loads doctor options, validates inputs, submits the right payload, and handles failures gracefully.

1. Scope
- Loading doctors from GET /doctors and rendering options.
- Submitting required-only payload.
- Submitting with optional fields populated.
- Handling backend failure and network/parse error on submit.
- Presence of required attributes on key fields.
- Presence of pattern constraints on constrained fields.
- Resilience when the doctors fetch fails.

Not covered (by this file)
- Visual styling/layout (CSS).
- Navigation/routing outside this component.
- Server behavior beyond mocked responses.
- Field-level HTML5 validation behavior (the browser handles it; we assert attributes exist).

2. Test Environment
- Test runner: Jest + @testing-library/react + @testing-library/user-event.
- All tests mock global.fetch.


---

# CreateDemographic Component - Test Cases

T1 — Loads doctors on mount and populates Family Physician select
- Goal: Verify doctor list is fetched on mount and rendered as options.
- Mock setup
    - GET /doctors → ["Dr. Who", "Dr. Strange"]
- Steps
    - render(<CreateDemographic />)
    - Assert placeholder “Select a doctor” is present.
    - await screen.findByRole('option', { name: 'Dr. Who' })
    - screen.getByRole('option', { name: 'Dr. Strange' })
- Pass criteria
    - Both doctor options rendered.


T2 — Successful submit with minimal required fields
- Goal: Verify a correct minimal POST and success UI.
- Mock setup
    - GET /doctors → ["Dr. Who"]
    - POST /patients → 200 OK with body { "id": 1 }
- User actions
    - Fill: firstname=John, lastname=Doe, province=Ontario, email=john.doe@example.com, dob=2000-01-02, family_physician=Dr. Who.
    - Click Create Patient.
- Assertions
    - Second fetch call is POST with JSON:
        ```
        {
        "firstname":"John","lastname":"Doe",
        "province":"Ontario","email":"john.doe@example.com",
        "dob":"2000-01-02","family_physician":"Dr. Who"
        }
        ```


Success message “✅ Patient Created Successfully” is shown.

Form submit button no longer visible.


T3 — Submit with optional fields populated
- Goal: Ensure optional inputs are captured and posted.
- Mock setup
    - GET /doctors → ["Dr. Strange"]
    - POST /patients → 200 OK (empty body is fine)
- User actions (in addition to required)
```
preferredname=Ali, address=123 King St, city=Toronto,
postalcode=A1A 1A1,
homephone=4165551111, workphone=4165552222, cellphone=4165553333,
sex=F,
healthinsurance_number=1234567890,
healthinsurance_version_code=AB,
patient_status=not enrolled.
```

- Assertions
    - Posted body contains all of the above fields (plus the required ones).


T4 — POST failure alerts and no success UI
- Goal: On 500, show a clear alert and keep the form.
- Mock setup
    - GET /doctors → ["Dr. Who"]
    - POST /patients → 500 with text "DB error"
- User actions
    - Fill required fields; submit.
- Assertions
    - window.alert called with: Save failed (500): DB error.
    - No success message.


T5 — Network/parse error alerts generic message
- Goal: If the POST throws (network/JSON), alert a generic error.
- Mock setup
    - GET /doctors → ["Dr. Who"]
    - POST /patients → rejected promise (e.g., new Error('boom'))
- User actions
    - Fill required; submit.
- Assertions
    - window.alert called with:
    - An unexpected error occurred while saving the patient.


T6 — required attributes present on key fields
- Goal: HTML5 required fields are marked correctly.
- Mock setup
    - GET /doctors → any success.
- Assertions
    - firstname, lastname, province, email, dob, family_physician all have required attribute.


T7 — pattern attributes for constrained fields
- Goal: Inputs have the right regex constraints.
- Mock setup
    - GET /doctors → any success.
- Assertions
    - postalcode → ^[A-Za-z]\d[A-Za-z] \d[A-Za-z]\d$
    - homephone / workphone / cellphone → ^\d{10}$
    - healthinsurance_number → ^\d{10}$
    - healthinsurance_version_code → ^[A-Z]{2}$


T8 — Doctors fetch failure logs error and select still renders
- Goal: Component is resilient if /doctors fails.
- Mock setup
    - GET /doctors → rejects (e.g., new Error('nope'))
    - Spy console.error.
- Assertions
    - Placeholder “Select a doctor” still visible (empty select rendered).
    - console.error called (component logs “Failed to fetch doctors:”).