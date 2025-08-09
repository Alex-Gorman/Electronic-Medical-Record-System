/**
 * @file LoginPage.js
 * @module LoginPage
 * @description
 * Login screen for the EMR Portal. Validates user inputs and authenticates
 * against the backend. On success, routes the user to the main menu.
 *
 * **Endpoint**
 * - `POST http://localhost:3002/login` (body: `{ username, password }`)
 *
 * @example
 * // In App.js route config
 * <Route path="/" element={<LoginPage />} />
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LoginPage.css';

/**
 * Shape of the local validation/error state.
 * @typedef {Object} LoginErrors
 * @property {string} username - Error message for the username field.
 * @property {string} password - Error message for the password field.
 * @property {string} login - General login/authentication error message.
 */

/**
 * LoginPage Component
 *
 * Renders the login UI, validates inputs, and performs authentication
 * via the backend. Navigates to `/MainMenu` upon successful login.
 *
 * @returns {JSX.Element}
 */
function LoginPage() {
  /* Username input value */
  const [username, setUsername] = useState('');

  /* Password input value */
  const [password, setPassword] = useState('');

  /** @type {[LoginErrors, Function]} Aggregated error messages. */
  const [errors, setErrors] = useState({
    username: '',
    password: '',
    login: ''
  });

  /** React Router navigation helper. */
  const navigate = useNavigate();

  /* ===== Handlers ===== */

  /**
   * Handles form submission:
   * - Runs client-side validation
   * - Calls backend login endpoint
   * - Navigates to `/MainMenu` on success
   *
   * @param {React.FormEvent<HTMLFormElement>} e - Form submission event
   * @returns {Promise<void>}
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    /* Reset error state before new validation attempt */
    /** @type {LoginErrors} */
    const newErrors = { username: '', password: '', login: '' };
    let hasError = false;

    /* Validate username */
    if (!username.trim()) {
      newErrors.username = 'Please enter a username';
      hasError = true;
    }

    /* Validate password */
    if (!password.trim()) {
      newErrors.password = 'Please enter a password';
      hasError = true;
    }

    setErrors(newErrors);
    if (hasError) return;

    /* Attempt to authenticate with backend */
    try {
      const response = await fetch('http://localhost:3002/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      /* If authentication is successful, redirect user */
      if (response.ok) {
        navigate('/MainMenu');
      } else {
        /* If credentials are invalid, show login-specific error */
        setErrors((prev) => ({ ...prev, login: 'Invalid username or password' }));
      }
    } catch (error) {
      /* Handle server/network errors gracefully */
      setErrors((prev) => ({ ...prev, login: 'Server error. Please try again later.' }));
    }
  };

  /* === Render === */

  return (
    <div className="main-container">
      {/* Left panel with title and info text */}
      <div className="left-panel">
        <h1 className="left-heading">EMR Portal</h1>
        <p className="left-text">
          Secure access to electronic medical records.
        </p>
      </div>

      {/* Right panel containing the login form */}
      <div className="right-panel">
        <div className="login-box">
          <h2>EMR Pro Login</h2>

          {/* Login Form */}
          <form onSubmit={handleSubmit} noValidate>
            {/* Username Input Field */}
            <label htmlFor="username" className="input-label">Username</label>
            <input
              id="username"
              type="text"
              className="input-field"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            {errors.username && (
              <div className="error-message">{errors.username}</div>
            )}

            {/* Password Input Field */}
            <label htmlFor="password" className="input-label">Password</label>
            <input
              id="password"
              type="password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {errors.password && (
              <div className="error-message">{errors.password}</div>
            )}

            {/* Login Failure Error */}
            {errors.login && (
              <div className="error-message">{errors.login}</div>
            )}

            {/* Submit Button */}
            <button type="submit" className="login-button">Sign In</button>
          </form>
        </div>

        {/* Footer text */}
        <p className="page-footer">EMR Professional Edition</p>
      </div>
    </div>
  );
}

export default LoginPage;
