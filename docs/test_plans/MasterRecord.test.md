# MasterRecord Test Plan

1. Scope & Goals
- Verify the Master Record view:
- Fetches and renders a patient and doctors list.
- Switches between view/edit modes.
- Validates and saves demographic edits (PUT), then re-fetches (GET).
- Renders/updates per-field validation errors.
- Handles all error states gracefully.

2. Test Environment
- Runner/Libs: Jest, @testing-library/react, @testing-library/user-event
- Router: MemoryRouter with initialEntries=["/demographic?patientId=1"]
- Network: mock global.fetch

3. Fixtures
```
const patientPayload = {
  id: 1,
  lastname: 'Doe',
  firstname: 'Jane',
  preferredname: 'Janie',
  sex: 'female',
  dob: '1980-05-15',
  homephone: '1234567890',
  cellphone: '0987654321',
  email: 'jane@example.com',
  address: '123 Main St',
  city: 'Toronto',
  province: 'Ontario',
  postalcode: 'M1A1A1',
  healthNumber: '0123456789',
  healthVersion: 'AB',
  status: 'active',
  familyPhysician: 'Dr. Wong',
};
const doctorsList = ['Dr. Wong', 'Dr. Smith'];
```

---

# MasterRecord Component Test Cases

## A. Loading & Success

1. Initial loading state
- Mock /patients/:id as pending (never resolve).

2. Happy path render
- /patients/:id → 200 + patientPayload
- /doctors → 200 + doctorsList
- Assert header shows DOE, JANE F <age> years, DOB trimmed to YYYY-MM-DD, doctors dropdown options present.

3. Age calculation edge
- Freeze time to a known date (near birthday).
- Assert correct age (e.g., birthday today vs. tomorrow).

## B. Error States

4. Missing patientId
- Route: /demographic (no patientId).
- Expect error text “No patient ID was provided”.

5. Patient fetch failed
- /patients/:id → 500
- Assert “Failed to load:” error message.

6. Doctors fetch failed
- /patients/:id → 200
- /doctors → 500
- Assert “Failed to load:” error message.

## C. Edit Mode & Form Behavior

7. Enter edit mode
- Click “Edit”; assert inputs prefilled with patient state.
- DOB input value trimmed to YYYY-MM-DD.

8. Cancel edit
- Modify a couple fields; click “Cancel”.
- Assert UI returns to view mode and shows original values.

9. Client-side validation: healthNumber
- In edit mode, type invalid value (e.g., 123).
- Assert error “Must be exactly 10 digits”.
- Click “Save”; assert no network call is made.

10. Client-side validation: healthVersion
- Type a then abc.
- Assert it shows “Must be exactly two uppercase letters”.
- Also assert the input is uppercased and capped at length 2.

11. Client-side validation: email
- Type bad-email.
- Assert “Invalid email address” and save blocked.

12. Client-side validation: postal code
- Type M1A1A (invalid).
- Assert “Invalid Canadian postal code”.

## D. Save Flow (PUT + re-fetch)
13. Successful save
- Edit some fields; click “Save”.
- Expect:
    - fetch called with PUT /patients/:id and correct payload mapping:
        - healthinsurance_number ← form.healthNumber
        - healthinsurance_version_code ← form.healthVersion
        - patient_status ← form.status
        - family_physician ← form.familyPhysician
        - dob trimmed to YYYY-MM-DD
    - Then a GET /patients/:id happens to refresh.
    - UI exits edit mode and shows the refreshed data.

14. Save fails
- PUT returns 500.
- Assert error banner “Failed to save: Status 500” (or similar).
- Stay in edit mode (no silent success).

## E. Dropdowns / Derived state
15. Doctors dropdown selects value
- Ensure the Family MD select shows doctors and selected value (Dr. Wong).

16. Status dropdown values
- Ensure only active and not enrolled are present and the selected matches current.







