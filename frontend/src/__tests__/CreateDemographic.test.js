import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CreateDemographic from '../CreateDemographic/CreateDemographic';

const byName = (name) => document.querySelector(`[name="${name}"]`);
const bySelect = (name) => document.querySelector(`select[name="${name}"]`);

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn();
  jest.spyOn(window, 'alert').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

/**
 * T1 — Loads doctors on mount and populates Family Physician select
 *
 * Purpose:
 *   Verify the component fetches /doctors on mount and renders the returned
 *   names as <option> elements in the Family Physician <select>.
 *
 * Given (mocks):
 *   GET /doctors → ["Dr. Who", "Dr. Strange"]
 *
 * Steps:
 *   1) Render <CreateDemographic />.
 *   2) Confirm placeholder "Select a doctor" is present.
 *   3) Await and assert each doctor appears as an <option>.
 *
 * Asserts:
 *   - Placeholder option is visible.
 *   - "Dr. Who" and "Dr. Strange" options are rendered.
 */
test('T1: Loads doctors on mount and populates Family Physician select', async () => {
  /* GET /doctors */
  global.fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ['Dr. Who', 'Dr. Strange'],
  });

  render(<CreateDemographic />);

  /* Default placeholder option is present */
  expect(screen.getByText(/select a doctor/i)).toBeInTheDocument();

  /* Options from backend appear */
  expect(await screen.findByRole('option', { name: 'Dr. Who' })).toBeInTheDocument();
  expect(screen.getByRole('option', { name: 'Dr. Strange' })).toBeInTheDocument();
});

/**
 * T2 — Successful submit with minimal required fields
 *
 * Purpose:
 *   Ensure that submitting only the required fields sends the correct payload
 *   to POST /patients and shows the success message that hides the form.
 *
 * Given (mocks):
 *   1) GET /doctors → ["Dr. Who"]
 *   2) POST /patients → 200 with JSON body { id: 1 }
 *
 * Steps:
 *   1) Render the form and fill minimum required fields.
 *   2) Click "Create Patient".
 *
 * Asserts:
 *   - POST called with Content-Type JSON and expected minimal payload.
 *   - Success message is shown; form submit button disappears.
 */
test('T2: Successful submit with minimal required fields posts payload and shows success message', async () => {
  /* 1) GET /doctors */
  global.fetch
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ['Dr. Who'],
    })
    /* 2) POST /patients */
    .mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({ id: 1 }),
    });

  render(<CreateDemographic />);

  /* Fill minimal required fields */
  await userEvent.type(byName('firstname'), 'John');
  await userEvent.type(byName('lastname'), 'Doe');
  await userEvent.selectOptions(bySelect('province'), 'Ontario');
  await userEvent.type(byName('email'), 'john.doe@example.com');
  await userEvent.type(byName('dob'), '2000-01-02');
  await userEvent.selectOptions(bySelect('family_physician'), 'Dr. Who');

  /* Submit */
  await userEvent.click(screen.getByRole('button', { name: /create patient/i }));

  /* Assert POST was made with expected body (minimum keys) */
  await waitFor(() => {
    const [, postOpts] = global.fetch.mock.calls[1]; /* second call is POST */
    expect(postOpts.method).toBe('POST');
    expect(postOpts.headers).toEqual(expect.objectContaining({ 'Content-Type': 'application/json' }));
    const body = JSON.parse(postOpts.body);
    expect(body).toEqual(
      expect.objectContaining({
        firstname: 'John',
        lastname: 'Doe',
        province: 'Ontario',
        email: 'john.doe@example.com',
        dob: '2000-01-02',
        family_physician: 'Dr. Who',
      })
    );
  });

  /* Success UI replaces the form */
  expect(await screen.findByText('✅ Patient Created Successfully')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /create patient/i })).toBeNull();
});

/**
 * T3 — Submit with optional fields populated
 *
 * Purpose:
 *   Validate that all optional inputs (phones, postal code, OHIP, status, etc.)
 *   are accepted and included in the POST payload along with required fields.
 *
 * Given (mocks):
 *   1) GET /doctors → ["Dr. Strange"]
 *   2) POST /patients → 200 with empty body ("")
 *
 * Steps:
 *   1) Render and fill required + optional fields.
 *   2) Submit.
 *
 * Asserts:
 *   - POST body contains all filled fields and values.
 *   - Success message appears.
 */
test('T3: Submits with optional fields populated (phones, postal code, OHIP, status, etc.)', async () => {
  global.fetch
    .mockResolvedValueOnce({ ok: true, json: async () => ['Dr. Strange'] }) /* GET doctors */
    .mockResolvedValueOnce({ ok: true, text: async () => '' }); /* POST ok with empty body */

  render(<CreateDemographic />);

  /* Required */
  await userEvent.type(byName('firstname'), 'Alice');
  await userEvent.type(byName('lastname'), 'Smith');
  await userEvent.selectOptions(bySelect('province'), 'Ontario');
  await userEvent.type(byName('email'), 'alice@example.com');
  await userEvent.type(byName('dob'), '1990-03-04');
  await userEvent.selectOptions(bySelect('family_physician'), 'Dr. Strange');

  /* Optional */
  await userEvent.type(byName('preferredname'), 'Ali');
  await userEvent.type(byName('address'), '123 King St');
  await userEvent.type(byName('city'), 'Toronto');
  await userEvent.type(byName('postalcode'), 'A1A 1A1');
  await userEvent.type(byName('homephone'), '4165551111');
  await userEvent.type(byName('workphone'), '4165552222');
  await userEvent.type(byName('cellphone'), '4165553333');
  await userEvent.selectOptions(bySelect('sex'), 'F');
  await userEvent.type(byName('healthinsurance_number'), '1234567890');
  await userEvent.type(byName('healthinsurance_version_code'), 'AB');
  await userEvent.selectOptions(bySelect('patient_status'), 'not enrolled');

  await userEvent.click(screen.getByRole('button', { name: /create patient/i }));

  await waitFor(() => {
    const [, postOpts] = global.fetch.mock.calls[1];
    const body = JSON.parse(postOpts.body);
    expect(body).toEqual(
      expect.objectContaining({
        firstname: 'Alice',
        lastname: 'Smith',
        preferredname: 'Ali',
        address: '123 King St',
        city: 'Toronto',
        province: 'Ontario',
        postalcode: 'A1A 1A1',
        homephone: '4165551111',
        workphone: '4165552222',
        cellphone: '4165553333',
        email: 'alice@example.com',
        dob: '1990-03-04',
        sex: 'F',
        healthinsurance_number: '1234567890',
        healthinsurance_version_code: 'AB',
        patient_status: 'not enrolled',
        family_physician: 'Dr. Strange',
      })
    );
  });

  expect(await screen.findByText('✅ Patient Created Successfully')).toBeInTheDocument();
});

/**
 * T4 — POST failure shows alert and no success message
 *
 * Purpose:
 *   Confirm when POST /patients returns a non-OK response, the component
 *   alerts the user with status + text and does not show success UI.
 *
 * Given (mocks):
 *   1) GET /doctors → ["Dr. Who"]
 *   2) POST /patients → 500 with text "DB error"
 *
 * Steps:
 *   1) Fill minimal required fields.
 *   2) Submit.
 *
 * Asserts:
 *   - window.alert called with "Save failed (500): DB error".
 *   - Success message not shown.
 */
test('T4: POST /patients failure alerts with status + text and does not show success', async () => {
  global.fetch
    .mockResolvedValueOnce({ ok: true, json: async () => ['Dr. Who'] }) /* GET doctors */
    .mockResolvedValueOnce({ ok: false, status: 500, text: async () => 'DB error' }); /* POST fails */

  render(<CreateDemographic />);

  /* Minimal required */
  await userEvent.type(byName('firstname'), 'John');
  await userEvent.type(byName('lastname'), 'Doe');
  await userEvent.selectOptions(bySelect('province'), 'Ontario');
  await userEvent.type(byName('email'), 'john@example.com');
  await userEvent.type(byName('dob'), '2001-01-01');
  await userEvent.selectOptions(bySelect('family_physician'), 'Dr. Who');

  await userEvent.click(screen.getByRole('button', { name: /create patient/i }));

  await waitFor(() => {
    expect(window.alert).toHaveBeenCalledWith('Save failed (500): DB error');
  });
  expect(screen.queryByText('✅ Patient Created Successfully')).toBeNull();
});

/**
 * T5 — Network/parse error shows generic alert
 *
 * Purpose:
 *   Ensure unexpected exceptions during POST (network failure or JSON parse)
 *   are caught and result in a generic user alert.
 *
 * Given (mocks):
 *   1) GET /doctors → ["Dr. Who"]
 *   2) POST /patients → throws Error("boom")
 *
 * Steps:
 *   1) Fill required fields.
 *   2) Submit.
 *
 * Asserts:
 *   - window.alert called with generic error message.
 */
test('T5: network/parse error during submit shows generic alert', async () => {
  global.fetch
    .mockResolvedValueOnce({ ok: true, json: async () => ['Dr. Who'] }) /* GET doctors */
    .mockRejectedValueOnce(new Error('boom')); /* POST throws */

  render(<CreateDemographic />);

  await userEvent.type(byName('firstname'), 'John');
  await userEvent.type(byName('lastname'), 'Doe');
  await userEvent.selectOptions(bySelect('province'), 'Ontario');
  await userEvent.type(byName('email'), 'john@example.com');
  await userEvent.type(byName('dob'), '2001-01-01');
  await userEvent.selectOptions(bySelect('family_physician'), 'Dr. Who');

  await userEvent.click(screen.getByRole('button', { name: /create patient/i }));

  await waitFor(() => {
    expect(window.alert).toHaveBeenCalledWith(
      'An unexpected error occurred while saving the patient.'
    );
  });
});

/**
 * T6 — Required attributes exist on key fields
 *
 * Purpose:
 *   Quickly verify HTML validation constraints are present on fields that
 *   must be filled by the user.
 *
 * Steps:
 *   1) Render component (mock /doctors).
 *   2) Assert 'required' attribute exists on key inputs/selects.
 *
 * Asserts:
 *   - firstname, lastname, province, email, dob, family_physician are required.
 */
test('T6: required attributes are present on key fields', async () => {
  global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ['Dr. Who'] });
  render(<CreateDemographic />);

  expect(byName('firstname')).toHaveAttribute('required');
  expect(byName('lastname')).toHaveAttribute('required');
  expect(bySelect('province')).toHaveAttribute('required');
  expect(byName('email')).toHaveAttribute('required');
  expect(byName('dob')).toHaveAttribute('required');
  expect(bySelect('family_physician')).toHaveAttribute('required');
  /* patient_status not required by code; we don't assert it */
});

/**
 * T7 — Pattern attributes exist for constrained fields
 *
 * Purpose:
 *   Ensure regex constraints are applied to inputs like postal code,
 *   phone numbers, OHIP number, and version code.
 *
 * Steps:
 *   1) Render component (mock /doctors).
 *   2) Assert 'pattern' attributes on constrained fields.
 *
 * Asserts:
 *   - Correct regex strings are set on postalcode, home/work/cell phones,
 *     health insurance number, and version code.
 */
test('T7: pattern attributes exist for constrained fields (postal code, phones, OHIP, version code)', async () => {
  global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ['Dr. Who'] });
  render(<CreateDemographic />);

  expect(byName('postalcode')).toHaveAttribute('pattern', '^[A-Za-z]\\d[A-Za-z] \\d[A-Za-z]\\d$');
  expect(byName('homephone')).toHaveAttribute('pattern', '^\\d{10}$');
  expect(byName('workphone')).toHaveAttribute('pattern', '^\\d{10}$');
  expect(byName('cellphone')).toHaveAttribute('pattern', '^\\d{10}$');
  expect(byName('healthinsurance_number')).toHaveAttribute('pattern', '^\\d{10}$');
  expect(byName('healthinsurance_version_code')).toHaveAttribute('pattern', '^[A-Z]{2}$');
});

/**
 * T8 — Doctors fetch failure is logged and UI still renders
 *
 * Purpose:
 *   Verify a failing /doctors request is handled gracefully: an error is logged,
 *   but the Family Physician select still renders with its placeholder so the
 *   page is usable.
 *
 * Given (mocks):
 *   GET /doctors → rejected Promise(Error('nope'))
 *
 * Steps:
 *   1) Render component.
 *   2) Confirm placeholder is present.
 *   3) Assert console.error was called.
 *
 * Asserts:
 *   - Placeholder "Select a doctor" visible.
 *   - console.error invoked.
 */
test('T8: doctors fetch failure is logged and select still renders', async () => {
  const err = new Error('nope');
  const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  global.fetch.mockRejectedValueOnce(err);

  render(<CreateDemographic />);

  /* Select is still present with placeholder option */
  expect(screen.getByText(/select a doctor/i)).toBeInTheDocument();

  /* Error was logged */
  await waitFor(() => {
    expect(consoleSpy).toHaveBeenCalled(); /* message text includes 'Failed to fetch doctors:' in component */
  });

  consoleSpy.mockRestore();
});

