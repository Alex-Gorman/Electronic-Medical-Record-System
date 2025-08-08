/**
 * @file Navbar.js
 * @module Navbar
 * @description
 * Top navigation bar for the EMR app. Renders left- and right-aligned
 * navigation links, and opens the Patient Search as a popup (instead of in-place navigation).
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Navbar.css';

/**
 * A single navigation item.
 * @typedef {Object} NavItem
 * @property {string} to - Target route path (used by react-router).
 * @property {string} label - Text label shown in the navbar.
 */

/**
 * Navbar component displays navigation links for the main EMR app.
 * The **Search** item opens a popup window instead of routing.
 *
 * @component
 * @returns {JSX.Element}
 *
 * @example
 * // Usage in AppWrapper (already wired up in your code)
 * <Navbar />
 */
function Navbar() {
  const location = useLocation();

  /**
   * Left-side navigation items.
   * Note: The item with label `"Search"` is handled specially (opens popup).
   * @type {NavItem[]}
   */
  const navItems = [
    { to: '/schedule', label: 'Schedule' },
    { to: '/caseload', label: 'Caseload' },
    { to: '/search', label: 'Search' }, /* special case -> popup */
    { to: '/report', label: 'Report' },
    { to: '/billing', label: 'Billing' },
    { to: '/inbox', label: 'Inbox' },
    { to: '/msg', label: 'Msg' },
    { to: '/consultations', label: 'Consultations' },
    { to: '/conreport', label: 'ConReport' },
    { to: '/preferences', label: 'Preferences' },
    { to: '/edoc', label: 'eDoc' },
    { to: '/tickler', label: 'Tickler' },
    { to: '/admin', label: 'Administration' },
  ];


  /* === Render === */

  
  return (
    <div className="oscar-navbar">
      {/* Left section of navbar */}
      <div className="navbar-left">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;

          {/* Special case: Search opens a popup */}
          if (item.label === 'Search') {
            return (
              <button
                key={item.to}
                className={`nav-link ${isActive ? 'active' : ''}`}
                /**
                 * Open the patient search page in a popup window.
                 * Prevent default so the button doesn't try to "navigate".
                 * @param {React.MouseEvent<HTMLButtonElement>} e
                 */
                onClick={(e) => {
                  e.preventDefault();
                  window.open('/search-popup', 'PatientSearch', 'width=1000,height=800');
                }}
              >
                {item.label}
              </button>
            );
          }

          {/* Default case: render as standard Link */}
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`nav-link ${isActive ? 'active' : ''}`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* Right section of navbar */}
      <div className="navbar-right">
        <Link to="/help" className="nav-link">Help</Link>
        <Link to="/" className="nav-link">Log Out</Link>
      </div>
    </div>
  );
}

export default Navbar;


