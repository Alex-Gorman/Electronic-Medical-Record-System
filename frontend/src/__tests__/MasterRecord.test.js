/* src/__tests__/MasterRecord.test.js */
import 'whatwg-fetch';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import MasterRecord from '../Components/MasterRecord';

/* can mock fetch */
const patientPayload = {
  lastname: 'Doe',
  firstname: 'Jane',
  dob: '1980-05-15',
  sex: 'female',
  preferredname: 'Janie',
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

beforeEach(() => {
  global.fetch = jest.fn((url) => {
    if (url.endsWith('/doctors')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(['Dr. Wong']) });
    }
    if (url.includes('/patients/')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(patientPayload) });
    }
    return Promise.reject(new Error('Unknown URL: ' + url));
  });
});

/* 0. Successful fetch of patient name & DOB */
test('renders patient name and DOB', async () => {
  render(
    <MemoryRouter initialEntries={['/demographic?patientId=1']}>
      <Routes>
        <Route path="/demographic" element={<MasterRecord />} />
      </Routes>
    </MemoryRouter>
  );

  /* wait for the "Loading" spinner to vanish */
  await waitFor(() => expect(screen.queryByText(/Loading/)).toBeNull());

  /* now our patient data should appear */
  expect(screen.getByText(/DOE, JANE F/)).toBeInTheDocument();
  expect(screen.getByText(/DOB:/)).toBeInTheDocument();
});

/* 1. Loading State test */
test('loading state before data arrives', async() => {
    /* 1) Stub fetch to return a promise that never resolves: */
    global.fetch = jest.fn(() => new Promise(() => {}));

    /* 2) Render the component under the same route context */
    render(
        <MemoryRouter initialEntries={['/demographic?patientId=1']}>
            <Routes>
                <Route path="/demographic" element={<MasterRecord />} />
            </Routes>
        </MemoryRouter>
    );

    /* 3) Immediately we should see the loading indicator */
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
});

/* 2. Error State Test */
test('show error message if the patient fetch fails', async () => {
    /* Mock fetch to fail */
    global.fetch = jest.fn(() =>
        Promise.resolve({ ok: false, status: 500 })
    );

    render(
        <MemoryRouter initialEntries={['/demographic?patientId=1']}>
            <Routes>
                <Route path="/demographic" element={<MasterRecord />} />
            </Routes>
        </MemoryRouter>
    );

    /* Wait for the component to give up loading and show an error, giving error message 'Failed to load' in any letter case */
    await screen.findByText(/Failed to load:/i);
    expect(screen.getByText(/Failed to load:/i)).toBeInTheDocument();
});

/* 4. Test rendering the sidebar links on the left */
test('renders sidebar links on success', async () => {
    render(
        <MemoryRouter initialEntries={['/demographic?patientId=1']}>
            <Routes>
            <Route path="/demographic" element={<MasterRecord />} />
            </Routes>
        </MemoryRouter>
    );

    /* wait for the "Loading" spinner to vanish */
    await waitFor(() => expect(screen.queryByText(/Loading/)).toBeNull());

    /* Make sure all 4 sidebar links are present */
    ['Appt. History', 'Billing History', 'Prescriptions', 'E-Chart']
    .forEach(linkText => {
        expect(screen.getByText(linkText)).toBeInTheDocument();
    });
});

/* 5. Test correct render of name and age at top of Master Record */
test('header shows correct name and age', async () => {
    render(
        <MemoryRouter initialEntries={['/demographic?patientId=1']}>
            <Routes>
                <Route path="/demographic" element={<MasterRecord />} />
            </Routes>
        </MemoryRouter>
    );

    /* wait for the "Loading" spinner to vanish */
    await waitFor(() => expect(screen.queryByText(/Loading/)).toBeNull());


    expect(screen.getByText(/^DOE, JANE F \d+ years$/)).toBeInTheDocument();
});

/* 6. Test to show the error message if the doctors fetch fails */
test('shows error message if doctors fetch fails', async () => {
    /* Mock fetch so that /patients:id succees but/doctors fails */
    global.fetch = jest.fn(url => {
        if (url.includes('/patients/')) {
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve(patientPayload),
            });
        }
        if (url.endsWith('/doctors')) {
            return Promise.resolve({ ok: false, status: 500 });
        }
        return Promise.reject(new Error('Unknown URL: ' + url));
    });

    /* Render the component */
    render(
        <MemoryRouter initialEntries={['/demographic?patientId=1']}>
            <Routes>
                <Route path="/demographic" element={<MasterRecord />} />
            </Routes>
        </MemoryRouter>
    );

    /* Wait for the error to appear (same error message format) */
    const errorNode = await screen.findByText(/Failed to load:/i);
    expect(errorNode).toBeInTheDocument();
});

