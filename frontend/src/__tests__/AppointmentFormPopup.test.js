import userEvent from '@testing-library/user-event';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import AppointmentFormPopup from '../Components/AppointmentFormPopup';

const setup = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/appointment-form-popup" element={<AppointmentFormPopup />} />
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn();
  window.alert = jest.fn();
  window.close = jest.fn();
});


/**
 * T1 — Click time slot - Render (ADD mode, required params present)
 * Path: /appointment-form-popup?mode=add&providerId=1&date=2025-08-04&time=10:00
 * Expect: Title, date/time prefilled, default duration = 15, Add/Cancel buttons, no Delete button, document.title updated.
 */
test('T1: renders add form with required params', async () => {
    setup('/appointment-form-popup?mode=add&providerId=1&date=2025-08-04&time=10:00');

    /* Heading */
    expect(screen.getByRole('heading', { level: 2, name: /MAKE AN APPOINTMENT/i })).toBeInTheDocument();

    /* Date (disabled) shows ISO date */
    const dateInput = screen.getByLabelText("Date:");
    expect(dateInput).toBeDisabled();
    expect(dateInput).toHaveValue('2025-08-04');

    /* Start time prefilled from query param */
    const timeInput = screen.getByLabelText(/start time/i);
    expect(timeInput).toHaveValue('10:00');

    /* Duration defaults to "15" */
    const durInput = screen.getByLabelText(/duration/i);

    /* number inputs can be asserted with display value */
    expect(durInput).toHaveDisplayValue('15');

    /* Buttons: Add Appointment & Cancel present, Delete not present in add mode */
    expect(screen.getByRole('button', { name: /add appointment/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete appointment/i })).toBeNull();

    /* Document title set by effect */
    await waitFor(() => expect(document.title).toBe('ADD APPOINTMENT'));
});


/**
 * T2 — Missing required URL params shows inline error
 * e.g., omit "time" (or providerId) and expect the error message.
 */
test('A2: shows inline error when required params are missing', () => {
  /* Missing time */
  setup('/appointment-form-popup?mode=add&providerId=1&date=2025-08-04');

  expect(
    screen.getByText(/error:\s*missing time or provider id\./i)
  ).toBeInTheDocument();

  /* Form should not render */
  expect(screen.queryByRole('heading', { level: 2 })).toBeNull();
});


/**
 * T3 — Edit mode loads existing appointment and populates fields
 * Path: /appointment-form-popup?mode=edit&providerId=1&date=2025-08-04&time=10:25&apptId=42
 * Mock GET /appointments/42 → populate start time, duration, reason, name; show Save/Delete; document.title updated.
 */
test('T3: edit mode loads appointment and populates fields', async () => {
  /* Mock the load of /appointments/:id */
  global.fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      id: 42,
      start_time: '10:25:00',
      duration_minutes: 30,
      reason: 'Follow-up',
      status: 'present',
      patient_id: 7,
      firstname: 'Jane',
      lastname: 'Doe',
    }),
  });

  setup('/appointment-form-popup?mode=edit&providerId=1&date=2025-08-04&time=10:25&apptId=42');

  /* Heading switches to edit */
  expect(
    screen.getByRole('heading', { level: 2, name: /edit an appointment/i })
  ).toBeInTheDocument();

  /* Document title set by effect */
  await waitFor(() => expect(document.title).toBe('EDIT APPOINTMENT'));

  /* Wait for fetch to resolve and form to populate */
  const timeInput = await screen.findByLabelText(/start time/i);
  expect(timeInput).toHaveValue('10:25');

  const durInput = screen.getByLabelText(/duration/i);
  expect(durInput).toHaveDisplayValue('30');

  const reasonBox = screen.getByLabelText(/reason/i);
  expect(reasonBox).toHaveDisplayValue('Follow-up');

  /* Name input shows "lastname, firstname" after selection */
  const nameInput = screen.getByLabelText(/name/i);
  expect(nameInput).toHaveDisplayValue('Doe, Jane');

  /* Buttons: Save Changes & Delete present in edit mode (and Cancel) */
  expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /delete appointment/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();

  /* Ensure fetch called the correct endpoint */
  expect(global.fetch).toHaveBeenCalledWith('http://localhost:3002/appointments/42');
});


/**
 * T4 —  conflict detection
 * Path: /appointment-form-popup?mode=add&providerId=1&date=2025-08-04&time=10:00
 * Try booking an appointment that conflicts with another appointment
 * alerts and NO save (no POST/PUT)
 */
test('T4: booking conflict -> alerts and does not save', async () => {
  /* 1) Patient search (triggered by pressing Enter in Name field) */
  global.fetch
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ([
        { id: 7, firstname: 'Jane', lastname: 'Doe' }
      ]),
    })
    /* 2) Conflict check: existing appt overlaps (10:00 for 30min) */
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ([
        { id: 99, start_time: '10:00:00', duration_minutes: 30 }
      ]),
    });

  const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

  setup('/appointment-form-popup?mode=add&providerId=1&date=2025-08-04&time=10:00');

  /* Type a name and press Enter to search */
  const nameInput = screen.getByLabelText(/name/i);
  await userEvent.type(nameInput, 'Doe{enter}');

  /* Click patient row to select */
  const rowCell = await screen.findByText('Doe, Jane');
  await userEvent.click(rowCell);

  /* Click "Add Appointment" */
  await userEvent.click(screen.getByRole('button', { name: /add appointment/i }));

  await waitFor(() => {
    expect(alertSpy).toHaveBeenCalledWith(
      'This time slot is already booked for the selected provider'
    );
  });

  /* Only two fetches should have happened: patient search + conflict check */
  expect(global.fetch).toHaveBeenCalledTimes(2);

  /* No POST/PUT to /appointments */
  const calledUrls = global.fetch.mock.calls.map(c => c[0]);
  expect(calledUrls.some(u => String(u).match(/\/appointments$/))).toBe(false);

  alertSpy.mockRestore();
});


/**
 * T5 —  Successful add
 * Path: /appointment-form-popup?mode=add&providerId=1&date=2025-08-04&time=10:00'
 * Try booking an appointment that has no conflicts and gets added
 * successful add – POST + postMessage + window.close
 */
test('T5: successful add posts, notifies opener, and closes', async () => {
  /* 1) patient search */
  /* 2) conflict check (no conflicts) */
  /* 3) POST /appointments ok */
  global.fetch
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ([
        { id: 7, firstname: 'Jane', lastname: 'Doe' }
      ]),
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ([]),
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 123 }),
    });

  const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
  const postMessageSpy = jest.fn();
  const closeSpy = jest.spyOn(window, 'close').mockImplementation(() => {});
  /* JSDOM doesn't set opener; stub it so we can assert the message */
  Object.defineProperty(window, 'opener', { value: { postMessage: postMessageSpy }, configurable: true });

  setup('/appointment-form-popup?mode=add&providerId=1&date=2025-08-04&time=10:00');

  /* Select patient via search */
  await userEvent.type(screen.getByLabelText(/name/i), 'Doe{enter}');
  await userEvent.click(await screen.findByText('Doe, Jane'));

  /* Save */
  await userEvent.click(screen.getByRole('button', { name: /add appointment/i }));

  /* Assert the third call is POST /appointments with expected payload */
  await waitFor(() => {
    const thirdCall = global.fetch.mock.calls[2];
    expect(thirdCall).toBeTruthy();
    const [url, opts] = thirdCall;
    expect(String(url)).toMatch(/\/appointments$/);
    expect(opts?.method).toBe('POST');
    expect(opts?.headers).toEqual(expect.objectContaining({ 'Content-Type': 'application/json' }));
    expect(JSON.parse(opts.body)).toEqual(expect.objectContaining({
      patientId: 7,
      providerId: '1',
      date: '2025-08-04',
      time: '10:00',
      duration: 15,
      status: 'booked',
    }));
  });

  /* UX side-effects */
  await waitFor(() => {
    expect(alertSpy).toHaveBeenCalledWith('Appointment booked');
    expect(postMessageSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'appointment-added', date: '2025-08-04' }),
      '*'
    );
    expect(closeSpy).toHaveBeenCalled();
  });

  alertSpy.mockRestore();
  closeSpy.mockRestore();
});


/**
 * T6 —  Successful edit
 * Try editing an appointment that has no conflicts and gets edited and saved
 * successful edit – POST + postMessage + window.close
 */
test('T6: edit mode saves via PUT /appointments/:id', async () => {
  /* 1) Load existing appt (edit) */
  /* 2) Conflict check (none) */
  /* 3) PUT /appointments/42 */
  global.fetch
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 42,
        start_time: '10:25:00',
        duration_minutes: 30,
        reason: 'Follow-up',
        status: 'present',
        patient_id: 7,
        firstname: 'Jane',
        lastname: 'Doe',
      }),
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ([]),
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 42 }),
    });

  const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
  const postMessageSpy = jest.fn();
  const closeSpy = jest.spyOn(window, 'close').mockImplementation(() => {});
  Object.defineProperty(window, 'opener', { value: { postMessage: postMessageSpy }, configurable: true });

  setup('/appointment-form-popup?mode=edit&providerId=1&apptId=42&date=2025-08-04&time=10:25');

  /* Wait for form to be populated from GET /appointments/42 */
  await screen.findByDisplayValue('Doe, Jane');
  await screen.findByDisplayValue('10:25');
  await screen.findByDisplayValue('30');
  await screen.findByDisplayValue('Follow-up');

  /* Save */
  await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

  /* Assert the PUT call */
  await waitFor(() => {
    const putCall = global.fetch.mock.calls.find(([u, o]) =>
      String(u).match(/\/appointments\/42$/) && o?.method === 'PUT'
    );
    expect(putCall).toBeTruthy();
    const [, opts] = putCall;
    const body = JSON.parse(opts.body);
    expect(body).toEqual(expect.objectContaining({
      id: '42',
      patientId: 7,
      providerId: '1',
      date: '2025-08-04',
      time: '10:25',
      duration: 30,
      reason: 'Follow-up',
      status: 'present',
    }));
  });

  /* UX side-effects */
  await waitFor(() => {
    expect(alertSpy).toHaveBeenCalledWith('Appointment updated');
    expect(postMessageSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'appointment-added', date: '2025-08-04' }),
      '*'
    );
    expect(closeSpy).toHaveBeenCalled();
  });

  alertSpy.mockRestore();
  closeSpy.mockRestore();
});


/**
 * T7 —  Successful delete
 * Try deleting an appointment and gets deleted
 * successful delete – DELETE + postMessage + window.close
 */
test('T7: delete sends DELETE, posts message, and closes', async () => {
  /* 1) preload edit data (GET /appointments/42) */
  global.fetch
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 42,
        start_time: '10:25:00',
        duration_minutes: 30,
        reason: 'Follow-up',
        status: 'present',
        patient_id: 7,
        firstname: 'Jane',
        lastname: 'Doe',
      }),
    })
    /* 2) DELETE /appointments/42 */
    .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

  /* Stub opener + close; make opener writable/configurable so JSDOM is happy */
  const postMessageSpy = jest.fn();
  Object.defineProperty(window, 'opener', {
    value: { postMessage: postMessageSpy },
    configurable: true,
    writable: true,
  });
  const closeSpy = jest.spyOn(window, 'close').mockImplementation(() => {});

  /* IMPORTANT: include the route path */
  setup('/appointment-form-popup?mode=edit&providerId=1&apptId=42&date=2025-08-04&time=10:25');

  /* wait for form to populate */
  await screen.findByDisplayValue('10:25');

  /* delete */
  await userEvent.click(screen.getByRole('button', { name: /delete appointment/i }));

  /* all of these happen asynchronously – assert inside waitFor */
  await waitFor(() => {
    /* DELETE was called */
    const delCall = global.fetch.mock.calls.find(
      ([url, opts]) => /\/appointments\/42$/.test(String(url)) && opts?.method === 'DELETE'
    );
    expect(delCall).toBeTruthy();

    /* parent notified + window closed */
    expect(postMessageSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'appointment-deleted',
        apptId: '42',
        date: '2025-08-04',
      }),
      '*'
    );
    expect(closeSpy).toHaveBeenCalled();
  });
});



/**
 * T8 —  Successful rounding of time
 * Try booking an appointment that is not rounded to nearest 5 min
 * Should auto round, then successfully book (no conflict)
 * successful add – POST + postMessage + window.close
 */
test('T8: rounds start time to nearest 5 min when saving (10:28 -> 10:30)', async () => {
  /* 1) patient search */
  /* 2) conflict check */
  /* 3) POST /appointments */
  global.fetch
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ([{ id: 7, firstname: 'Jane', lastname: 'Doe' }]),
    })
    .mockResolvedValueOnce({ ok: true, json: async () => ([]) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 99 }) });

  setup('/appointment-form-popup?mode=add&providerId=1&date=2025-08-04&time=10:28');

  await userEvent.type(screen.getByLabelText(/name/i), 'Doe{enter}');
  await userEvent.click(await screen.findByText('Doe, Jane'));
  await userEvent.click(screen.getByRole('button', { name: /add appointment/i }));

  await waitFor(() => {
    const postCall = global.fetch.mock.calls.find(
      ([url, opts]) => /\/appointments$/.test(String(url)) && opts?.method === 'POST'
    );
    expect(postCall).toBeTruthy();

    const [, postOpts] = postCall;
    const body = JSON.parse(postOpts.body);
    expect(body).toEqual(
      expect.objectContaining({
        date: '2025-08-04',
        time: '10:30',
        providerId: '1',
        patientId: 7,
      })
    );
  });
});


/**
 * T9 — Duration input sanitization
 * - Strips leading zeros (e.g., "025" -> "25")
 * - Ignores non-digits (typing "x" does not change value)
 * - Allows empty string during edit
 */
test('T9: duration input strips leading zeros and ignores non-digits', async () => {
  setup('/appointment-form-popup?mode=add&providerId=1&date=2025-08-04&time=10:00');

  const durInput = screen.getByLabelText(/duration/i);

  /* default shows "15" */
  expect(durInput).toHaveDisplayValue('15');

  /* Clear and type with leading zeros → they’re stripped to "25" */
  await userEvent.clear(durInput);
  await userEvent.type(durInput, '025');
  expect(durInput).toHaveDisplayValue('25');

  /* Typing a letter should be ignored by sanitizer */
  await userEvent.type(durInput, 'x');
  expect(durInput).toHaveDisplayValue('25');

  /* Allow empty string while editing */
  await userEvent.clear(durInput);
  expect(durInput).toHaveDisplayValue('');
});


/**
 * T10 — Status mapping (UI <-> backend)
 * - Default UI shows "To Do" (backend "booked")
 * - Changing to "Here" saves backend status "present"
 */
test('T10: selecting a status maps to correct backend value on save', async () => {
  /* 1) patient search → 2) conflict check (none) → 3) POST ok */
  global.fetch
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ([{ id: 7, firstname: 'Jane', lastname: 'Doe' }]),
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ([]),
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 123 }),
    });

  setup('/appointment-form-popup?mode=add&providerId=1&date=2025-08-04&time=10:00');

  /* Pick a patient so the form can be saved */
  await userEvent.type(screen.getByLabelText(/name/i), 'Doe{enter}');
  await userEvent.click(await screen.findByText('Doe, Jane'));

  /* Change Status from default "To Do" to "Here" */
  const statusSelect = screen.getByRole('combobox'); // only select on the page
  await userEvent.selectOptions(statusSelect, 'Here');
  expect(statusSelect).toHaveDisplayValue('Here');

  /* Save */
  await userEvent.click(screen.getByRole('button', { name: /add appointment/i }));

  /* Assert POST body uses backend value "present" */
  await waitFor(() => {
    const postCall = global.fetch.mock.calls.find(
      ([url, opts]) => /\/appointments$/.test(String(url)) && opts?.method === 'POST'
    );
    expect(postCall).toBeTruthy();

    const [, opts] = postCall;
    const body = JSON.parse(opts.body);
    expect(body).toEqual(
      expect.objectContaining({
        status: 'present',  // UI "Here" → backend "present"
        patientId: 7,
        providerId: '1',
        date: '2025-08-04',
        time: '10:00',
      })
    );
  });
});


/**
 * T11 — Patient search error handling
 * - Pressing Enter triggers search; if backend returns error, alerts and stays in form view
 */
test('T11: patient search failure alerts and stays on form view', async () => {
  /* First call: /patients/search → 500 error with message */
  global.fetch.mockResolvedValueOnce({
    ok: false,
    status: 500,
    json: async () => ({ error: 'Search failed' }),
  });

  const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

  setup('/appointment-form-popup?mode=add&providerId=1&date=2025-08-04&time=10:00');

  /* Trigger search via Enter in the Name field */
  await userEvent.type(screen.getByLabelText(/name/i), 'Doe{enter}');

  /* Alert shown with backend error, and we do NOT switch to the "Select Patient" search view */
  await waitFor(() => {
    expect(alertSpy).toHaveBeenCalledWith('Search failed');
  });
  expect(screen.queryByRole('heading', { name: /select patient/i })).toBeNull();
  /* Still on the main form (e.g., "Add Appointment" button is visible) */
  expect(screen.getByRole('button', { name: /add appointment/i })).toBeInTheDocument();

  alertSpy.mockRestore();
});


/**
 * T12 — edit mode skips self in conflict check and saves
 */
test('T12: edit mode skips self in conflict check and saves', async () => {
  /* 1) preload edit data (GET /appointments/42) */
  global.fetch
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 42,
        start_time: '10:25:00',
        duration_minutes: 30,
        reason: 'Follow-up',
        status: 'present',
        patient_id: 7,
        firstname: 'Jane',
        lastname: 'Doe',
      }),
    })
    /* 2) conflict check: include SAME appt id (should be skipped) and a non-overlapping other appt */
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ([
        { id: 42, start_time: '10:25:00', duration_minutes: 30 }, /* self -> skip */
        { id: 99, start_time: '12:00:00', duration_minutes: 30 }, /* non-overlap */
      ]),
    })
    /* 3) PUT /appointments/42 succeeds */
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 42 }),
    });

  const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
  const postMessageSpy = jest.fn();
  const closeSpy = jest.spyOn(window, 'close').mockImplementation(() => {});
  Object.defineProperty(window, 'opener', { value: { postMessage: postMessageSpy }, configurable: true });

  /* IMPORTANT: include the full route path prefix */
  setup('/appointment-form-popup?mode=edit&providerId=1&apptId=42&date=2025-08-04&time=10:25');

  /* Wait until edit values are visible */
  await screen.findByDisplayValue('Doe, Jane');
  await screen.findByDisplayValue('10:25');

  /* Save changes */
  await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

  /* PUT was called */
  await waitFor(() => {
    const putCall = global.fetch.mock.calls.find(
      ([u, o]) => /\/appointments\/42$/.test(String(u)) && o?.method === 'PUT'
    );
    expect(putCall).toBeTruthy();
  });

  /* No conflict alert fired */
  expect(alertSpy).not.toHaveBeenCalledWith(
    'This time slot is already booked for the selected provider'
  );

  /* Side-effects */
  await waitFor(() => {
    expect(postMessageSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'appointment-added', date: '2025-08-04' }),
      '*'
    );
    expect(closeSpy).toHaveBeenCalled();
  });

  alertSpy.mockRestore();
  closeSpy.mockRestore();
});


/**
 * T13 — save failure (add) → alerts and does NOT close or postMessage ---
 */
test('T13: add failure alerts and does not close', async () => {
  /* 1) patient search */
  /* 2) conflict check (no conflicts) */
  /* 3) POST fails with 500 */
  global.fetch
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ([{ id: 7, firstname: 'Jane', lastname: 'Doe' }]),
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ([]),
    })
    .mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'oops' }),
    });

  const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
  const postMessageSpy = jest.fn();
  const closeSpy = jest.spyOn(window, 'close').mockImplementation(() => {});
  Object.defineProperty(window, 'opener', { value: { postMessage: postMessageSpy }, configurable: true });

  setup('/appointment-form-popup?mode=add&providerId=1&date=2025-08-04&time=10:00');

  /* Choose patient then save */
  await userEvent.type(screen.getByLabelText(/name/i), 'Doe{enter}');
  await userEvent.click(await screen.findByText('Doe, Jane'));
  await userEvent.click(screen.getByRole('button', { name: /add appointment/i }));

  /* Failing POST should trigger the alert and NOT close/postMessage */
  await waitFor(() => {
    expect(alertSpy).toHaveBeenCalledWith('Failed to book appointment');
  });
  expect(postMessageSpy).not.toHaveBeenCalled();
  expect(closeSpy).not.toHaveBeenCalled();

  alertSpy.mockRestore();
  closeSpy.mockRestore();
});


/**
 * T14: search view toggles; clicking a row selects patient and returns to form with name shown
 */
test('T14: selecting a patient row fills name and returns to form', async () => {
  /* Search returns one result */
  global.fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ([
      { id: 7, firstname: 'Jane', lastname: 'Doe' },
    ]),
  });

  setup('/appointment-form-popup?mode=add&providerId=1&date=2025-08-04&time=10:00');

  /* Trigger search (Enter in Name) */
  await userEvent.type(screen.getByLabelText(/name/i), 'Doe{enter}');

  /* We should be in the search view */
  expect(await screen.findByRole('heading', { name: /select patient/i })).toBeInTheDocument();
  const resultRow = await screen.findByText('Doe, Jane');

  /* Click the result row */
  await userEvent.click(resultRow);

  /* Back to form view; name input shows "Doe, Jane" */
  expect(screen.getByRole('heading', { name: /make an appointment/i })).toBeInTheDocument();
  expect(screen.getByLabelText(/name/i)).toHaveDisplayValue('Doe, Jane');
});







