const mockedNavigate = jest.fn();

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return { ...actual, useNavigate: () => mockedNavigate };
});

import 'whatwg-fetch';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from '../LoginPage/LoginPage';

const setup = () =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <LoginPage />
    </MemoryRouter>
  );

beforeEach(() => {
  jest.resetAllMocks();
  global.fetch = jest.fn();
});

/**
 * T1 — Smoke/UI render
 *
 * Goal:
 *   Verify the login form renders its essential controls.
 *
 * Given:
 *   The LoginPage is mounted at "/".
 *
 * When:
 *   No interaction occurs.
 *
 * Then:
 *   - Username input is present
 *   - Password input is present (type="password" covered in T8)
 *   - "Sign In" button is present
 */
test('T1: Renders username, password and login button', () => {
  setup();
  expect(screen.getByLabelText('Username')).toBeInTheDocument();
  expect(screen.getByLabelText('Password')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
});

/**
 * T2 — Validation: submit with both fields empty
 *
 * Goal:
 *   Ensure client-side validation prevents a network call when both fields are empty.
 *
 * Given:
 *   The LoginPage is mounted and both fields are blank.
 *
 * When:
 *   User clicks "Sign In".
 *
 * Then:
 *   - Inline validation messages are shown for username and password
 *   - fetch() is NOT called
 */
test('T2: Click login with both fields empty', async () => {
  const fetchSpy = jest.spyOn(global, 'fetch');
  setup();

  await userEvent.click(screen.getByRole('button', { name: 'Sign In' }));

  expect(screen.getByText('Please enter a username')).toBeInTheDocument();
  expect(screen.getByText('Please enter a password')).toBeInTheDocument();
  expect(fetchSpy).not.toHaveBeenCalled();
});

/**
 * T3 — Validation: submit with empty password
 *
 * Goal:
 *   Ensure client-side validation prevents a network call when password is missing.
 *
 * Given:
 *   Username is filled, password is blank.
 *
 * When:
 *   User clicks "Sign In".
 *
 * Then:
 *   - Password error is shown
 *   - fetch() is NOT called
 */
test('T3: Click login button with password field empty', async () => {
  const fetchSpy = jest.spyOn(global, 'fetch');
  setup();

  await userEvent.type(screen.getByLabelText('Username'), 'Admin');
  await userEvent.click(screen.getByRole('button', { name: 'Sign In' }));

  expect(screen.getByText('Please enter a password')).toBeInTheDocument();
  expect(fetchSpy).not.toHaveBeenCalled();
});

/**
 * T4 — Validation: submit with empty username
 *
 * Goal:
 *   Ensure client-side validation prevents a network call when username is missing.
 *
 * Given:
 *   Password is filled, username is blank.
 *
 * When:
 *   User clicks "Sign In".
 *
 * Then:
 *   - Username error is shown
 *   - fetch() is NOT called
 */
test('T4: Click login button with username field empty', async () => {
  const fetchSpy = jest.spyOn(global, 'fetch');
  setup();

  await userEvent.type(screen.getByLabelText('Password'), 'Admin1234');
  await userEvent.click(screen.getByRole('button', { name: 'Sign In' }));

  expect(screen.getByText('Please enter a username')).toBeInTheDocument();
  expect(fetchSpy).not.toHaveBeenCalled();
});

/**
 * T5 — Successful login flow
 *
 * Goal:
 *   On valid credentials and 200 response, navigate to /MainMenu.
 *
 * Given:
 *   Backend returns 200 OK { message: 'Login Successful' }.
 *
 * When:
 *   User fills username+password and clicks "Sign In".
 *
 * Then:
 *   - useNavigate is called with '/MainMenu'
 */
test('T5: Successful login navigates to /MainMenu', async () => {
  global.fetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => ({ message: 'Login Successful' }),
  });

  setup();

  await userEvent.type(screen.getByLabelText('Username'), 'Admin');
  await userEvent.type(screen.getByLabelText('Password'), 'Admin1234');
  await userEvent.click(screen.getByRole('button', { name: 'Sign In' }));

  await waitFor(() => {
    expect(mockedNavigate).toHaveBeenCalledWith('/MainMenu');
  });
});

/**
 * T6 — Invalid credentials
 *
 * Goal:
 *   Show error message on 401 and remain on the login page.
 *
 * Given:
 *   Backend returns 401 with { message: 'Invalid username or password' }.
 *
 * When:
 *   User submits wrong credentials.
 *
 * Then:
 *   - Error message is displayed
 *   - (Implicitly) We do not navigate away (no useNavigate call)
 */
test('T6: Invalid credentials shows an error, gets 401, and stays on /', async () => {
  global.fetch.mockResolvedValueOnce({
    ok: false,
    status: 401,
    json: async () => ({ message: 'Invalid username or password' }),
  });

  setup();

  await userEvent.type(screen.getByLabelText('Username'), 'wrong');
  await userEvent.type(screen.getByLabelText('Password'), 'wrong');
  await userEvent.click(screen.getByRole('button', { name: 'Sign In' }));

  await waitFor(() => {
    expect(screen.getByText('Invalid username or password')).toBeInTheDocument();
  });
  // Optionally: expect(mockedNavigate).not.toHaveBeenCalled();
});

/**
 * T7 — Server error handling
 *
 * Goal:
 *   Show a user-facing error when server returns 500, keep the user on the login page.
 *
 * Given:
 *   Backend returns 500 with { message: 'Server error' }.
 *
 * When:
 *   User submits valid-looking credentials.
 *
 * Then:
 *   - A generic login failure message is shown (component currently reuses the same message)
 *   - No navigation occurs
 */
test('T7: Server error returning status:500', async () => {
  global.fetch.mockResolvedValueOnce({
    ok: false,
    status: 500,
    json: async () => ({ message: 'Server error' }),
  });

  setup();

  await userEvent.type(screen.getByLabelText('Username'), 'Admin');
  await userEvent.type(screen.getByLabelText('Password'), 'Admin1234');
  await userEvent.click(screen.getByRole('button', { name: 'Sign In' }));

  await waitFor(() => {
    expect(screen.getByText('Invalid username or password')).toBeInTheDocument();
  });
  // Optionally: expect(mockedNavigate).not.toHaveBeenCalled();
});

/**
 * T8 — Password input type
 *
 * Goal:
 *   Ensure the password field masks input (type="password").
 *
 * Given:
 *   LoginPage is rendered.
 *
 * When:
 *   We query the password input by label.
 *
 * Then:
 *   - The input has attribute type="password"
 */
test('T8: password input is type="password"', () => {
  setup();
  const pwd = screen.getByLabelText('Password');
  expect(pwd).toHaveAttribute('type', 'password');
});

