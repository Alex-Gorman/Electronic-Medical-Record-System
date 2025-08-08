import './App.css';
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import Navbar from './Navbar/Navbar';
import LoginPage from './LoginPage/LoginPage';
import MainMenu from './MainMenu/MainMenu';
import SearchPage from './SearchPage/SearchPage';
import CreateDemographic from './CreateDemographic/CreateDemographic';
import AppointmentFormPopup from './Components/AppointmentFormPopup';
import MasterRecord from './Components/MasterRecord';
import CalendarPopup from './Components/CalendarPopup';


/**
 * @file App.js
 * @module App
 * @description
 * Root of the React application. Sets up client-side routing and
 * conditionally renders the top navigation bar based on the current route.
 * 
 * ## Routes
 * - `/`                      → {@link LoginPage}
 * - `/MainMenu`              → {@link MainMenu}
 * - `/search-popup`          → {@link SearchPage} (popup-style page)
 * - `/create-demographic`    → {@link CreateDemographic}
 * - `/appointment-form-popup`→ {@link AppointmentFormPopup} (popup)
 * - `/casemgmt`              → (placeholder route)
 * - `/billing`               → (placeholder route)
 * - `/demographic`           → {@link MasterRecord}
 * - `/Rx`                    → (placeholder route)
 * - `/calendar-popup`        → {@link CalendarPopup} (popup)
 *
 * The navbar is hidden on popup-style pages and the login page.
 */


/**
 * List of routes where the global {@link Navbar} should be hidden.
 * These are typically full-screen pages or "popup" windows rendered as routes.
 * @constant
 * @type {string[]}
 */
const HIDE_NAVBAR_ROUTES = [
  '/',
  '/search-popup',
  '/create-demographic',
  '/appointment-form-popup',
  '/casemgmt',
  '/billing',
  '/demographic',
  '/Rx',
  '/calendar-popup',
];

/**
 * AppWrapper is an internal component that can use React Router hooks.
 * It decides whether to render the {@link Navbar} (based on the current path)
 * and defines the app's route mapping.
 *
 * @returns {JSX.Element}
 *
 * @example
 * // Rendered by <App/> inside a <Router> so it can call useLocation()
 * <AppWrapper />
 */
function AppWrapper() {
  const location = useLocation();

  /**
   * Whether to show the {@link Navbar} for the current route.
   * @type {boolean}
   */
  const showNavbar = !HIDE_NAVBAR_ROUTES.includes(location.pathname);

  return (
    <div>
      {showNavbar && <Navbar />}
      <Routes>
        {/* Public / auth */}
        <Route path="/" element={<LoginPage />} />

        {/* Main application screens */}
        <Route path="/MainMenu" element={<MainMenu />} />
        <Route path="/demographic" element={<MasterRecord />}/>

        {/* Popups / focused workflows */}
        <Route path="/search-popup" element={<SearchPage />} />
        <Route path="/create-demographic" element={<CreateDemographic />} />
        <Route path="/appointment-form-popup" element={<AppointmentFormPopup />} />
        <Route path="/calendar-popup" element={<CalendarPopup />} />

        {/* Placeholders for future modules */}
        <Route path="/casemgmt"/>
        <Route path="/billing"/>
        <Route path="/Rx"/>
      </Routes>
    </div>
  );
}

/**
 * Root component that bootstraps the app with a Router context.
 * Wraps {@link AppWrapper} so child components can use Router features
 * (e.g., {@link useLocation}, {@link useNavigate}, etc.).
 *
 * @returns {JSX.Element}
 *
 * @example
 * // index.js
 * import React from 'react';
 * import { createRoot } from 'react-dom/client';
 * import App from './App';
 * createRoot(document.getElementById('root')).render(<App />);
 */
function App() {
  return (
    <Router>
      <AppWrapper />
    </Router>
  );
}

export default App;


