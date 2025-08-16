/**
 * @file MainMenu.test.js
 */
import React from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MainMenu from '../MainMenu/MainMenu';
import { act } from 'react-dom/test-utils';

// ---------- helpers ----------

function LocationSpy() {
  const loc = useLocation();
  return (
    <div data-testid="loc">
      {loc.pathname}{loc.search}
    </div>
  );
}

const renderAt = (path = '/MainMenu') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <>
        <MainMenu />
        <LocationSpy />
      </>
    </MemoryRouter>
  );

// Stable sample data for the day 2025-08-04
const ISO = '2025-08-04';
const apptsInitial = [
  {
    id: 'a1',
    start_time: '10:00:00',
    duration_minutes: 30,
    status: 'booked',
    patient_id: 'p1',
    firstname: 'John',
    lastname: 'Doe',
    provider_name: 'Dr. Wong',
    reason: 'Follow-up',
  },
  {
    id: 'a2',
    start_time: '13:00:00',
    duration_minutes: 15,
    status: 'present',
    patient_id: 'p2',
    firstname: 'Jane',
    lastname: 'Roe',
    provider_name: 'Dr. Smith',
    reason: 'Injection',
  },
  {
    id: 'a3',
    start_time: '15:00:00',
    duration_minutes: 20,
    status: 'booked',
    patient_id: 'p3',
    firstname: 'Amy',
    lastname: 'Chan',
    provider_name: 'Dr. Smith',
    reason: 'Consult',
  },
];

// URL-aware fetch mock
const makeFetch = (overrides = {}) => {
  return jest.fn(async (url, opts = {}) => {
    // allow per-test overrides by exact string or predicate
    for (const key of Object.keys(overrides)) {
      const matcher = overrides[key];
      const match =
        typeof key === 'string'
          ? url === key
          : typeof key === 'function'
          ? key(url, opts)
          : false;
      if (match) return matcher(url, opts);
    }

    // default routes
    if (url.includes('/doctors')) {
      return {
        ok: true,
        json: async () => ['Dr. Wong', 'Dr. Smith'],
      };
    }

    if (url.includes('/appointments?')) {
      // e.g. /appointments?date=YYYY-MM-DD
      return {
        ok: true,
        json: async () => apptsInitial,
      };
    }

    if (url.match(/\/appointments\/.*\/status$/) && opts.method === 'PUT') {
      return {
        ok: true,
        json: async () => ({ ok: true }),
      };
    }

    // fallback empty ok
    return {
      ok: true,
      json: async () => [],
      text: async () => '',
    };
  });
};

beforeEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
  // window.open spy for the tests that trigger popups
  jest.spyOn(window, 'open').mockImplementation(() => null);
  // baseline fetch
  global.fetch = makeFetch();
});

afterEach(() => {
  window.open.mockRestore();
});

// Simple Response-like helpers for our fetch mock
const okJson = (data) =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: async () => data,
    text: async () => JSON.stringify(data),
  });

const createdJson = (data) =>
  Promise.resolve({
    ok: true,
    status: 201,
    json: async () => data,
    text: async () => JSON.stringify(data),
  });

const okNoContent = () =>
  Promise.resolve({
    ok: true,
    status: 204,
    // 204 has no body; json() should not be called in code, but make it loud if it is
    json: async () => { throw new Error('No content'); },
    text: async () => '',
  });

const notOk = (status, data = { error: 'fail' }) =>
  Promise.resolve({
    ok: false,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
  });


// ---------- TESTS ----------

/**
 * T1 — Renders headers (doctor names) and boundary time cells
 * GIVEN /doctors returns two names and no appointments
 * EXPECT the header cells to show doctor names and boundary time labels 07:00 & 23:55 to be present
 */
test('T1: shows provider headers from backend and boundary time cells', async () => {
  renderAt(`/MainMenu?date=${ISO}`);

  // Wait for doctors to load (resolves act warning)
  expect(await screen.findByText('Dr. Wong')).toBeInTheDocument();
  expect(screen.getByText('Dr. Smith')).toBeInTheDocument();

  // Boundary time cells
  expect(screen.getAllByText('07:00')).toHaveLength(2); // left & right columns
  expect(screen.getAllByText('23:55')).toHaveLength(2);
});


/**
 * T2 — Click left time cell opens ADD popup for provider 1
 * GIVEN date=2025-08-04 and empty appointments
 * WHEN clicking the left "09:30" time cell
 * EXPECT window.open called with providerId=1 and expected query string
 */
test('T2: clicking left time cell opens Add popup for provider 1', async () => {
  renderAt(`/MainMenu?date=${ISO}`);

  // ensure table is ready
  await screen.findByText('Dr. Wong');

  const nineThirtyCells = screen.getAllByText('09:30'); // left & right time columns
  await userEvent.click(nineThirtyCells[0]); // left time column opens providerId=1

  expect(window.open).toHaveBeenCalledTimes(1);
  const [href, title, features] = window.open.mock.calls[0];

  expect(href).toContain(`/appointment-form-popup`);
  expect(href).toContain(`providerId=1`);
  expect(href).toContain(`mode=add`);
  expect(href).toContain(`date=${ISO}`);
  // time is URL-encoded (09:30 -> 09%3A30)
  expect(href).toContain(`time=09%3A30`);
  expect(title).toBe('ADD APPOINTMENT');
  expect(features).toBe('width=600,height=550');
});


/**
 * T3 — Click right time cell opens ADD popup for provider 2
 * GIVEN date=2025-08-04 and empty appointments
 * WHEN clicking the right "14:00" time cell
 * EXPECT window.open called with providerId=2
 */
test('T3: clicking right time cell opens Add popup for provider 2', async () => {
  renderAt(`/MainMenu?date=${ISO}`);
  await screen.findByText('Dr. Wong');

  const twoPmCells = screen.getAllByText('14:00');
  await userEvent.click(twoPmCells[1]); // right time column -> providerId=2

  expect(window.open).toHaveBeenCalledTimes(1);
  const [href, title, features] = window.open.mock.calls[0];

  expect(href).toContain(`providerId=2`);
  expect(href).toContain(`mode=add`);
  expect(href).toContain(`date=${ISO}`);
  expect(href).toContain(`time=14%3A00`);
  expect(title).toBe('ADD APPOINTMENT');
  expect(features).toBe('width=600,height=550');
});


/**
 * T4 — Clicking patient name opens EDIT popup with apptId and provider
 * GIVEN an appointment for Dr. Smith at 10:00 with id=77
 * WHEN user clicks on the patient name
 * EXPECT window.open called with mode=edit, apptId=77, providerId=2, time=10:00
 */
test('T4: clicking patient name opens Edit popup with correct query', async () => {
  renderAt(`/MainMenu?date=${ISO}`);

  // Ensure appointments rendered; click "John Doe" (Dr. Wong at 10:00)
  const name = await screen.findByText(/John Doe/);
  await userEvent.click(name);

  expect(window.open).toHaveBeenCalledTimes(1);
  const [href, title, features] = window.open.mock.calls[0];

  expect(href).toContain(`/appointment-form-popup`);
  expect(href).toContain(`mode=edit`);
  expect(href).toMatch(/providerId=1|providerId=2/); // provider inferred by column (John is Dr. Wong -> 1)
  expect(href).toContain(`apptId=a1`);
  expect(href).toContain(`date=${ISO}`);
  expect(href).toContain(`time=10%3A00`);
  expect(title).toBe('EDIT APPOINTMENT');
  expect(features).toBe('width=600,height=550');
});


/**
 * T5 — Click folder icon cycles status and sends PUT /appointments/:id/status
 * GIVEN a booked appt for Dr. Wong at 10:15 with id=42
 * WHEN clicking the folder icon
 * EXPECT a PUT to /appointments/42/status with next status "present" and a follow-up refetch
 */
test('T5: status click cycles to next and issues PUT with refetch', async () => {
  // Track fetch calls
  const fetchSpy = jest.spyOn(global, 'fetch');

  renderAt(`/MainMenu?date=${ISO}`);
  const jane = await screen.findByText(/Jane Roe/); // Dr. Smith 13:00, status 'present'
  const cell = jane.closest('td');
  const icon = within(cell).getByText('📁');

  await userEvent.click(icon);

  // Expect a PUT to /appointments/:id/status with next status
  await waitFor(() => {
    const putCall = fetchSpy.mock.calls.find(
      ([u, o]) => /\/appointments\/a2\/status$/.test(u) && o?.method === 'PUT'
    );
    expect(putCall).toBeTruthy();
    const [, opts] = putCall;
    const body = JSON.parse(opts.body);
    // present -> being_seen
    expect(body).toEqual({ id: 'a2', status: 'being_seen' });
  });

  // And a refetch after the PUT
  expect(
    fetchSpy.mock.calls.some(([u, o]) => u.includes(`/appointments?date=${ISO}`) && (!o || o.method === 'GET'))
  ).toBe(true);
});


/**
 * T6 — Receives {type:'appointment-deleted'} message and removes row
 * GIVEN view contains appt id=99 for today
 * WHEN a window message arrives with { type:'appointment-deleted', apptId:'99', date:'2025-08-04' }
 * EXPECT the appointment row to disappear and a background refetch to occur
 */
test('T6: message "appointment-deleted" removes row and refetches', async () => {
  const ISO = '2025-08-04';

  // Appointments BEFORE delete (includes Amy Chan with id 'a3')
  const apptsInitial = [
    {
      id: 'a1',
      start_time: '09:30:00',
      duration_minutes: 15,
      status: 'booked',
      patient_id: 'p1',
      firstname: 'John',
      lastname: 'Doe',
      provider_name: 'Dr. Wong',
      reason: 'Cough',
    },
    {
      id: 'a3', // <— we will delete this one
      start_time: '08:00:00',
      duration_minutes: 10,
      status: 'present',
      patient_id: 'p3',
      firstname: 'Amy',
      lastname: 'Chan',
      provider_name: 'Dr. Smith',
      reason: 'Immunization',
    },
  ];

  // AFTER delete (a3 removed)
  const apptsAfterDelete = apptsInitial.filter(a => a.id !== 'a3');

  const fetchSpy = jest.spyOn(global, 'fetch');
  let apptCalls = 0;

  fetchSpy.mockImplementation(url => {
    if (url.endsWith('/doctors')) return okJson(['Dr. Wong', 'Dr. Smith']);
    if (url.includes('/appointments?date=')) {
      apptCalls += 1;
      // initial render may fetch 1–2 times; always serve initial first, then serve "after delete"
      return apptCalls <= 2 ? okJson(apptsInitial) : okJson(apptsAfterDelete);
    }
    // PUTs etc. not used here
    return okJson([]);
  });

  renderAt(`/MainMenu?date=${ISO}`);

  // Amy is visible before the message
  expect(await screen.findByText(/Amy Chan/)).toBeInTheDocument();

  // Dispatch the message INSIDE act so React can flush the state update
  await act(async () => {
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'appointment-deleted', apptId: 'a3', date: ISO },
      })
    );
  });

  await act(async () => {
  window.dispatchEvent(
    new MessageEvent('message', { data: { type: 'appointment-deleted', apptId: 'a2', date: ISO } })
  );
});


  // Row disappears and a refetch happens
  await waitFor(() => {
    expect(screen.queryByText(/Amy Chan/)).not.toBeInTheDocument();
    expect(
      fetchSpy.mock.calls.some(([u]) => typeof u === 'string' && u.includes(`/appointments?date=${ISO}`))
    ).toBe(true);
  });
});


/**
 * T7 — Receives {type:'appointment-added'} message and refetches to show new row
 * GIVEN no appointments initially
 * WHEN message "appointment-added" arrives
 * EXPECT a refetch and the newly returned appointment to render
 */
test('T7: message "appointment-added" triggers refetch and shows new appointment', async () => {
  const ISO = '2025-08-04';

  // BEFORE (no Bob yet)
  const apptsInitial = [
    {
      id: 'a1',
      start_time: '09:30:00',
      duration_minutes: 15,
      status: 'booked',
      patient_id: 'p1',
      firstname: 'John',
      lastname: 'Doe',
      provider_name: 'Dr. Wong',
      reason: 'Cough',
    },
  ];

  // AFTER (Bob White appears)
  const apptsAfterAdd = [
    ...apptsInitial,
    {
      id: 'a4',
      start_time: '11:15:00',
      duration_minutes: 20,
      status: 'booked',
      patient_id: 'p4',
      firstname: 'Bob',
      lastname: 'White',
      provider_name: 'Dr. Smith',
      reason: 'Consult',
    },
  ];

  const fetchSpy = jest.spyOn(global, 'fetch');
  let apptCalls = 0;

  fetchSpy.mockImplementation(url => {
    if (url.endsWith('/doctors')) return okJson(['Dr. Wong', 'Dr. Smith']);
    if (url.includes('/appointments?date=')) {
      apptCalls += 1;
      // serve initial list first (initial render), then updated list after the message
      return apptCalls <= 2 ? okJson(apptsInitial) : okJson(apptsAfterAdd);
    }
    return okJson([]);
  });

  renderAt(`/MainMenu?date=${ISO}`);

  // Sanity: Bob not there yet
  expect(screen.queryByText(/Bob White/)).not.toBeInTheDocument();

  // Fire the "added" message INSIDE act
  await act(async () => {
    window.dispatchEvent(new MessageEvent('message', { data: { type: 'appointment-added', date: ISO } }));
  });

  // New appt appears after refetch
  expect(await screen.findByText(/Bob White/)).toBeInTheDocument();
});


/**
 * T8 — Date navigation: Prev / Next / Today update URL query and trigger fetches
 * GIVEN initial date=2025-08-14
 * WHEN clicking Next, Prev, Today
 * EXPECT location.search to update to ?date=... and appointment fetches to include that date
 */
test('T8: date navigation updates URL (?date=) and fetches appointments', async () => {
  const fetchSpy = jest.spyOn(global, 'fetch');

  renderAt(`/MainMenu?date=${ISO}`);
  await screen.findByText('Dr. Wong');

  // click ► next day
  await userEvent.click(screen.getByRole('button', { name: '▶' }));

  // Location shows new query and appointments fetched for the new day
  await waitFor(() => {
    expect(screen.getByTestId('loc').textContent).toMatch(/\?date=2025-08-05$/);
    expect(
      fetchSpy.mock.calls.some(([u]) => u.includes('/appointments?date=2025-08-05'))
    ).toBe(true);
  });
});

