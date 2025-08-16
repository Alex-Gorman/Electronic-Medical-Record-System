import React from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Navbar from '../Navbar/Navbar';

/**
 * Tiny probe component to surface the current router path
 * so we can assert navigation without a full app shell.
 */
function LocationSpy() {
  const loc = useLocation();
  return <div data-testid="loc">{loc.pathname}</div>;
}

/**
 * Helper: render the Navbar inside a MemoryRouter
 * starting at the given path. Also render LocationSpy
 * so we can assert against the current path.
 */
const renderAt = (path = '/MainMenu') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <>
        <Navbar />
        <LocationSpy />
      </>
    </MemoryRouter>
  );

describe('Navbar', () => {

  
  /**
   * T1 — Render: menu items & link types
   *
   * GIVEN we render at /MainMenu
   * WHEN the Navbar mounts
   * THEN the primary left-side items are visible,
   * AND the right-side "Help" and "Log Out" are links,
   * AND "Search" is rendered as a button (not a link).
   *
   * Why: Verifies static structure and ARIA roles/types used by the UI.
   */
  test('T1: renders full menu and right-side links; Search is a button, not a link', () => {
    renderAt('/MainMenu');

    // Left-side items (sampled list; extend if needed)
    [
      'Schedule',
      'Caseload',
      'Search',
      'Report',
      'Billing',
      'Inbox',
      'Preferences',
      'Administration',
    ].forEach(label => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });

    // Right-side links
    expect(screen.getByRole('link', { name: /help/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /log out/i })).toBeInTheDocument();

    // Search is specifically a button, not a link
    expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Search' })).toBeNull();
  });


  /**
   * T2 — Active state: Billing
   *
   * GIVEN current path is /billing
   * WHEN the Navbar renders
   * THEN "Billing" is marked active (has 'active' class),
   * AND unrelated items (e.g., "Schedule" and "Search") are not active.
   *
   * Why: Ensures active route highlighting works for standard links.
   */
  test('T2: active state: /billing highlights Billing only', () => {
    renderAt('/billing');

    expect(screen.getByRole('link', { name: 'Billing' })).toHaveClass('active');
    // Others should not be active
    expect(screen.getByRole('link', { name: 'Schedule' })).not.toHaveClass('active');
    expect(screen.getByRole('button', { name: 'Search' })).not.toHaveClass('active');
  });


  /**
   * T3 — Active state: Search button
   *
   * GIVEN current path is /search
   * WHEN the Navbar renders
   * THEN the Search button reflects active state (has 'active' class).
   *
   * Why: "Search" is a button (opens a popup) but still needs correct
   * visual active state when on search-related routes.
   */
  test('T3: active state: /search highlights Search button', () => {
    renderAt('/search');
    expect(screen.getByRole('button', { name: 'Search' })).toHaveClass('active');
  });


  /**
   * T4 — Search popup behavior
   *
   * GIVEN we are on /MainMenu
   * WHEN the user clicks the Search button
   * THEN window.open is called with the correct popup URL and features,
   * AND the current route does not change (no client-side navigation).
   *
   * Why: Confirms popup workflow and prevents accidental in-app routing.
   */
  test('T4: Search opens popup and does not navigate', async () => {
    const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);

    renderAt('/MainMenu');
    expect(screen.getByTestId('loc')).toHaveTextContent('/MainMenu');

    await userEvent.click(screen.getByRole('button', { name: 'Search' }));

    expect(openSpy).toHaveBeenCalledWith(
      '/search-popup',
      'PatientSearch',
      'width=1000,height=800'
    );

    // Still on the same path (no navigation)
    expect(screen.getByTestId('loc')).toHaveTextContent('/MainMenu');

    openSpy.mockRestore();
  });


  /**
   * T5 — Standard link navigation
   *
   * GIVEN we are on /MainMenu
   * WHEN the user clicks the "Billing" link
   * THEN the path updates to /billing.
   *
   * AND WHEN the user clicks "Help"
   * THEN the path updates to /help.
   *
   * AND WHEN the user clicks "Log Out"
   * THEN the path updates to "/".
   *
   * Why: Ensures normal anchor-based navigation is wired correctly in the navbar.
   */
  test('T5: standard link navigation works (Billing, Help, Log Out)', async () => {
    renderAt('/MainMenu');

    // Billing
    await userEvent.click(screen.getByRole('link', { name: 'Billing' }));
    expect(screen.getByTestId('loc')).toHaveTextContent('/billing');

    // Help
    await userEvent.click(screen.getByRole('link', { name: /help/i }));
    expect(screen.getByTestId('loc')).toHaveTextContent('/help');

    // Log Out → "/"
    await userEvent.click(screen.getByRole('link', { name: /log out/i }));
    expect(screen.getByTestId('loc')).toHaveTextContent('/');
  });
});


