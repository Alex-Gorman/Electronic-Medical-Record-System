// LoginPage.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LoginPage.css';

/**
 * LoginPage Component
 * 
 * This component renders the login interface for the EMR Portal.
 * It validates user input, handles errors, and performs authentication 
 * against a backend login endpoint. On successful login, it redirects
 * the user to the main menu page.
 */
function LoginPage() {
  // State variables for user input
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // State for managing error messages for each field and login process
  const [errors, setErrors] = useState({
    username: '',
    password: '',
    login: ''
  });

  const navigate = useNavigate();

  /**
   * Handles form submission logic
   * Validates fields and attempts login via backend API
   * Redirects to main menu if login is successful
   * Displays appropriate error messages otherwise
   * 
   * @param {Event} e - Form submission event
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Reset error state before new validation attempt
    const newErrors = { username: '', password: '', login: '' };
    let hasError = false;

    // Validate username
    if (!username.trim()) {
      newErrors.username = 'Please enter a username';
      hasError = true;
    }

    // Validate password
    if (!password.trim()) {
      newErrors.password = 'Please enter a password';
      hasError = true;
    }

    // Update error state
    setErrors(newErrors);

    // If validation failed, don't proceed
    if (hasError) return;

    // Attempt to authenticate with backend
    try {
      const response = await fetch('http://localhost:3002/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      // If authentication is successful, redirect user
      if (response.ok) {
        navigate('/MainMenu');
      } else {
        // If credentials are invalid, show login-specific error
        setErrors((prev) => ({ ...prev, login: 'Invalid username or password' }));
      }
    } catch (error) {
      // Handle server/network errors gracefully
      setErrors((prev) => ({ ...prev, login: 'Server error. Please try again later.' }));
    }
  };

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










