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
 * AppWrapper is a component that enables the use of React Router hooks.
 * It conditionally renders the Navbar based on the current route and defines all route mappings.
 */
function AppWrapper() {
  const location = useLocation();

  /* Hide navbar on login, popup search, and create-demographic pages */
  const hideNavbarRoutes = ['/', '/search-popup', '/create-demographic', '/appointment-form-popup', '/casemgmt', '/billing', '/demographic', '/Rx', '/calendar-popup'];
  const showNavbar = !hideNavbarRoutes.includes(location.pathname);

  return (
    <div>

      {showNavbar && <Navbar />}
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/MainMenu" element={<MainMenu />} />
        <Route path="/search-popup" element={<SearchPage />} />
        <Route path="/create-demographic" element={<CreateDemographic />} />
        <Route path="/appointment-form-popup" element={<AppointmentFormPopup />} />
        <Route path="/casemgmt"/>
        <Route path="/billing"/>
        <Route path="/demographic" element={<MasterRecord />}/>
        <Route path="/Rx"/>
        <Route path="/calendar-popup" element={<CalendarPopup />} />
      </Routes>
    </div>
  );
}

/**
 * App is the root component of the React application.
 * It wraps the app in a React Router context and renders AppWrapper.
 */
function App() {
  return (
    <Router>
      <AppWrapper />
    </Router>
  );
}

export default App;


