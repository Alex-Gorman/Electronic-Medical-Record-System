// src/Navbar/Navbar.js
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Navbar.css';

/**
 * Navbar component displays navigation links for the main EMR app.
 * It highlights the active link based on current route.
 * The "Search" link opens a popup instead of routing.
 */
function Navbar() {
  const location = useLocation();

  // Define the left-side navigation items
  const navItems = [
    { to: '/schedule', label: 'Schedule' },
    { to: '/caseload', label: 'Caseload' },
    { to: '/search', label: 'Search' }, /* special case: opens popup */
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

  return (
    <div className="oscar-navbar">
      {/* Left section of navbar */}
      <div className="navbar-left">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;

          // Special case: Search opens a popup
          if (item.label === 'Search') {
            return (
              <button
                key={item.to}
                className={`nav-link ${isActive ? 'active' : ''}`}
                onClick={(e) => {
                  e.preventDefault();
                  /* window.open('/search-popup', 'PatientSearch', 'width=600,height=400'); */
                  window.open('/search-popup', 'PatientSearch', 'width=1000,height=800');
                }}
              >
                {item.label}
              </button>
            );
          }

          // Default case: render as standard Link
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


