import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import SearchPage from '../SearchPage/SearchPage';

beforeEach(() => {
  global.fetch = jest.fn();
  window.alert = jest.fn();
});

const setup = (path = '/search-popup') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/search-popup" element={<SearchPage />} />
        <Route path="/create-demographic" element={<div data-testid="create">Create</div>} />
      </Routes>
    </MemoryRouter>
  );


/**
 * T1 — Intitial rendering shows default UI
 * Heading = "Patient Search", 4 Buttons, "No Results yet", Select search mode option selector should be on Name
 * Last, First should be placeholder text in textbox
 */  
test('T1: Initial render shows default UI', () => {
    setup();

    expect(screen.getByRole('heading', { name: "Patient Search"})).toBeInTheDocument();

    expect(screen.getByRole('button', { name: "Search"})).toBeInTheDocument();
    expect(screen.getByRole('button', { name: "Inactive"})).toBeInTheDocument();
    expect(screen.getByRole('button', { name: "All"})).toBeInTheDocument();
    expect(screen.getByRole('button', { name: "Create Demographic"})).toBeInTheDocument();

    expect(screen.getByText("No Results yet")).toBeInTheDocument();

    expect(screen.getByRole('combobox', { name: "Select search mode"}));
    expect(screen.getByRole('option', {name: 'Name'}).selected).toBe(true);
    expect(screen.getByRole('option', { name: 'Phone' }).selected).toBe(false);

    expect(screen.getByPlaceholderText("Last, First")).toBeInTheDocument();
});

/**
 * T2 — Placeholder by mode
 * Change mode to Phone/DOB/Address/Health#/Email and verify input placeholder updates.
 */
test('T2: placeholder updates when switching search modes', async () => {
    setup();

    const modeSelect = screen.getByRole('combobox', { name: "Select search mode"});
    const keywordInput = screen.getByLabelText("Select keyword");

    /* Default mode is Name */
    expect(keywordInput).toHaveAttribute('placeholder', 'Last, First');

    /* Phone */
    await userEvent.selectOptions(modeSelect, 'search_phone');
    expect(keywordInput).toHaveAttribute('placeholder', 'Enter phone number (e.g. 4161234567)');

    /* DOB */
    await userEvent.selectOptions(modeSelect, 'search_dob');
    expect(keywordInput).toHaveAttribute('placeholder', 'YYYY-MM-DD');

    /* Address */
    await userEvent.selectOptions(modeSelect, 'search_address');
    expect(keywordInput).toHaveAttribute('placeholder', 'Enter address');

    /* Health Insurance */
    await userEvent.selectOptions(modeSelect, 'search_health_number');
    expect(keywordInput).toHaveAttribute('placeholder', 'Enter Health Insurance #');

    /* Email */
    await userEvent.selectOptions(modeSelect, 'search_email');
    expect(keywordInput).toHaveAttribute('placeholder', 'Enter email');

    /* Back to Name */
    await userEvent.selectOptions(modeSelect, 'search_name');
    expect(keywordInput).toHaveAttribute('placeholder', 'Last, First');
});


/**
 * T3 — Success (name: last only)
 * Type "Sm" in Name mode, click Search, ensure correct URL and table shows “Smith, John”.
 */
test('T3: name search (last-only) calls correct URL and renders row', async () => {
  /* mock a single matching row */
  global.fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ([
      {
        id: 1,
        lastname: 'Smith',
        firstname: 'John',
        dob: '1990-02-03',
        cellphone: '4161234567',
        email: 'john@ex.com',
        patient_status: 'active',
      }
    ]),
  });

  setup();

  /* Ensure we're in Name mode (default), type "Sm", click Search */
  const keywordInput = screen.getByLabelText("Select keyword");
  await userEvent.clear(keywordInput);
  await userEvent.type(keywordInput, 'Sm');

  await userEvent.click(screen.getByRole('button', { name: "Search" }));

  /* Assert fetch was called with the correct query string */
  expect(global.fetch).toHaveBeenCalledTimes(1);
  const [calledUrl] = global.fetch.mock.calls[0];
  expect(calledUrl).toMatch("/patients/search?");
  expect(calledUrl).toContain('keyword=Sm');
  expect(calledUrl).toContain('mode=search_name');

  /* Table should render with the row “Smith, John” */
  expect(await screen.findByText('Smith, John')).toBeInTheDocument();
});


/**
 * T4 — Success (name: Last, First)
 * Type "Smith, Jo" in Name mode, click Search, ensure correct URL and table shows “Smith, John”.
 */
test('T4: encodes "Last, First" in URL', async () => {
    global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ([
            {
                id: 1,
                lastname: 'Smith',
                firstname: 'John',
                dob: '1990-02-03',
                cellphone: '4161234567',
                email: 'john@ex.com',
                patient_status: 'active',
            }
        ]),
    });

    setup();
    const keywordInput = screen.getByLabelText("Select keyword");
    await userEvent.clear(keywordInput);
    await userEvent.type(keywordInput, 'Smith, Jo');

    await userEvent.click(screen.getByRole('button', { name: "Search" }));

    /* Assert fetch was called with the correct query string */
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [calledUrl] = global.fetch.mock.calls[0];
    expect(calledUrl).toMatch("/patients/search?");
    expect(calledUrl).toContain('keyword=Smith%2C%20Jo');
    expect(calledUrl).toContain('mode=search_name');

    /* Table should render with the row “Smith, John” */
    expect(await screen.findByText('Smith, John')).toBeInTheDocument();
});


/**
 * T5 — DOB truncation
 * DOB truncation → shows first 10 chars only
 */
test('T5: DOB truncation → shows first 10 chars only', async () => {
    global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ([
        {
            id: 1,
            lastname: 'Smith',
            firstname: 'John',
            dob: '1990-02-03T00:00:00Z',
            email: 'john@ex.com',
            patient_status: 'active',
        },
        ]),
    });

    setup();

    await userEvent.type(screen.getByLabelText("Select keyword"), 'Smith');
    await userEvent.click(screen.getByRole('button', { name: "Search" }));

    /* DOB cell should be truncated to YYYY-MM-DD */
    expect(await screen.findByText('1990-02-03')).toBeInTheDocument();
    
    /* And the full ISO string should NOT appear */
    expect(screen.queryByText('1990-02-03T00:00:00Z')).toBeNull();
});

/**
 * T6 — No matches
 * Shows No Results yet.
 */
test('T6: No matches → shows "No Results yet" and no table', async () => {
  global.fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ([]),
  });

  setup();
  await userEvent.type(screen.getByLabelText("Select keyword"), 'zzz');
  await userEvent.click(screen.getByRole('button', { name: "Search" }));

  /* Shows empty state text */
  expect(await screen.findByText("No Results yet")).toBeInTheDocument();

  /* And there should be no results table rendered */
  expect(screen.queryByRole('table')).toBeNull();
});


/**
 * T7 — Backend 500
 * Server error
 */
test('T7: 500 shows server error', async () => {
  global.fetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({ error: 'Server error' }) });

  setup();
  await userEvent.type(screen.getByLabelText("Select keyword"), 'Sm');
  await userEvent.click(screen.getByRole('button', { name: "Search" }));

  await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Server error'));
});


/**
 * T8 — Create Demographic nav
 * Navigates to /create-demographic
 */
test('T8: create demographic navigates', async () => {
  setup();
  await userEvent.click(screen.getByRole('button', { name: /create demographic/i }));
  expect(await screen.findByTestId('create')).toBeInTheDocument();
});



/**
 * T9 — Non-10-digit phone, Mode=Phone, 12345
 *  Phone cell renders unchanged (12345).  
 */
test('T9: Mode=Phone with non-10-digit number renders unchanged', async () => {
  /* Backend returns a short phone value */
  global.fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ([
      {
        id: 1,
        lastname: 'Smith',
        firstname: 'John',
        dob: '1990-02-03',
        cellphone: '12345', // not 10 digits → should NOT be formatted
        email: 'john@ex.com',
        patient_status: 'active',
      }
    ]),
  });

  setup();

  /* Switch to Phone mode */
  const modeSelect = screen.getByLabelText(/select search mode/i);
  await userEvent.selectOptions(modeSelect, 'search_phone');

  /* Enter short number and search */
  const keywordInput = screen.getByLabelText(/select keyword/i);
  await userEvent.clear(keywordInput);
  await userEvent.type(keywordInput, '12345');
  await userEvent.click(screen.getByRole('button', { name: /search/i }));

  /* Table shows the raw "12345" (no XXX-XXX-XXXX formatting) */
  expect(await screen.findByText('12345')).toBeInTheDocument();
  expect(screen.queryByText(/\d{3}-\d{3}-\d{4}/)).toBeNull();
  expect(screen.getByRole('table')).toBeInTheDocument();
});




