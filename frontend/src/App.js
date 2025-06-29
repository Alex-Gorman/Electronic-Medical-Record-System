import './App.css';
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import Navbar from './Navbar/Navbar';
import LoginPage from './LoginPage/LoginPage';
import MainMenu from './MainMenu/MainMenu';
import SearchPage from './SearchPage/SearchPage';

/**
 * AppWrapper is a component that enables the use of React Router hooks.
 * It conditionally renders the Navbar based on the current route and defines all route mappings.
 */
function AppWrapper() {
  const location = useLocation();

  /* Hide Navbar on the login and search popup pages */
  const showNavbar = location.pathname !== '/' && location.pathname !== '/search-popup';

  return (
    <div>

      {showNavbar && <Navbar />}
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/MainMenu" element={<MainMenu />} />
        <Route path="/search-popup" element={<SearchPage />} />

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


