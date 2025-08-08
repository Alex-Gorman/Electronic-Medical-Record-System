/**
 * SearchPage.js
 *
 * Patient search UI for the EMR.
 *
 * Features:
 *  - Search patients by name (supports "Last" or "Last, First")
 *  - Search patients by Phone, DOB, Address, Health Insurance #, Email
 *  - Link out to "Create Demographic" page
 *
 * Backend endpoint used (base: http://localhost:3002):
 *  - GET /patients/search?keyword=<string>&mode=<"search_name"|"search_phone"|"search_dob"|"search_health_number"|"search_email"|"search_address">
 *
 * @file
 * @module SearchPage
 * @component SearchPage
 * @example
 *  Rendered by a route in your app:
 * <Route path="/search" element={<SearchPage />} />
 */

import React, { useState } from 'react';
import './SearchPage.css';
import { useNavigate } from 'react-router-dom';

/**
 * Allowed search modes accepted by the backend.
 * @typedef {'search_name'|'search_phone'|'search_dob'|'search_health_number'|'search_email'|'search_address'} SearchMode
 */


/**
 * Shape of a patient row returned by the search API.
 * Only fields referenced by this component are listed.
 * @typedef {Object} Patient
 * @property {number} id
 * @property {string} lastname
 * @property {string} firstname
 * @property {string} [cellphone]
 * @property {string} [homephone]
 * @property {string} [workphone]
 * @property {string} [dob]              // ISO date string "YYYY-MM-DD..."
 * @property {string} [email]
 * @property {string} [patient_status]
 */


/**
 * Search page for finding patients by various fields. Has a textbox to type a value, and a dropdown menu to choose
 * a field to search (name, phone, dob, health #, email, address). Displays list of patients who have this demographic
 * info.
 *
 * @returns {JSX.Element}
 */
function SearchPage() {
  /* ===== Component state ===== */
  /** @type {[string, React.Dispatch<React.SetStateAction<string>>]} */
  const [keyword, setKeyword] = useState('');

  /** @type {[SearchMode, React.Dispatch<React.SetStateAction<SearchMode>>]} */
  const [searchMode, setSearchMode] = useState('search_name');

  /** @type {[Patient[], React.Dispatch<React.SetStateAction<Patient[]>>]} */
  const [results, setResults] = useState([]);

  /* Allows redirection to different pages in the app */
  const navigate = useNavigate();


  /* ===== Helpers ===== */


  /**
   * Format a 10-digit phone number into "XXX-XXX-XXXX".
   * Returns the original string if it doesn't look like 10 digits.
   * 
   * @param {*} number 
   * @returns {string}
   */
  function formatPhone(number) {
    /* Param validation, if no phone number, return an empty string */
    if (!number) return '';

    /* Remove all non-digit characters */
    const cleanedNumber = number.replace(/\D/g, '');

    /* If cleaned number does not have exactly 10 digits, return the original input */
    if (cleanedNumber.length !== 10) return number;

    /* Slice the cleaned number into 3 parts, and put dashes in to give format XXX-XXX-XXXX */
    return `${cleanedNumber.slice(0,3)}-${cleanedNumber.slice(3,6)}-${cleanedNumber.slice(6)}`;
  } 

  /**
   * Placeholder text based on active search mode.
   *
   * @returns {string}
   */
  function getPlaceholder() {
    switch (searchMode) {
      case 'search_phone':
        return 'Enter phone number (e.g. 4161234567)';
      case 'search_dob':
        return 'YYYY-MM-DD';
      case 'search_health_number':
        return 'Enter Health Insurance #';
      case 'search_email':
        return 'Enter email';
      case 'search_address':
        return 'Enter address';
      case 'search_name':
        return 'Last, First';
      default:
        return 'Last, First';
    }
  }


  /* ===== Handlers ===== */


  /**
   * Submit handler for the search form.
   * Sends a GET to `/patients/search` with `keyword` and `mode`,
   * then updates the results table.
   *
   * @param {React.FormEvent<HTMLFormElement>} e
   * @returns {Promise<void>}
   */
  const handleSubmit = async (e) => {
    /* Prevent the page reloading (default form submission behaviour) */
    e.preventDefault();

    try {

      /* Encode the keyword and send it to the backend API via a GET request */
      const res = await fetch(`http://localhost:3002/patients/search?keyword=${encodeURIComponent(keyword)}&mode=${encodeURIComponent(searchMode)}`);

      /** @type {Patient[]|{error: string}} */
      const data = await res.json();

      /* Handle HTTP errors */
      if (!res.ok) {
        alert(data.error || 'Search failed'); 
        return;
      }

      /* If the search was successful, store the results in the component state to make the table */
      setResults(Array.isArray(data) ? data : []);
    } catch (err) {
      /* Got an error, log error and notify user */
      console.error(err);
      alert('Failed to fetch results');
    }
  };


  /**
   * Navigate to the "Create Demographic" page.
   */
  const handleCreateClick = () => {
    navigate('/create-demographic');
  };


  /* === Render === */


  return (
    <>
      {/* Main container for the search interface */}
      <div className="search-container">

        {/* Header with title and links */}
        <div className="search-header">
          <h1>Patient Search</h1>
          <div className="header-links">
            <span>Help</span> | <span>About</span>
          </div>
        </div>

        {/* Search form */}
        <form className="search-form" onSubmit={handleSubmit}>

          {/* Dropdown menu to select search mode */}
          <select
            value={searchMode}
            onChange={(e) => setSearchMode(e.target.value)}
            aria-label="Select search mode"
            >
              <option value="search_name">Name</option>
              <option value="search_phone">Phone</option>
              <option value="search_dob">DOB yyyy-mm-dd</option>
              <option value="search_address">Address</option>
              <option value="search_health_number">Health Ins. #</option>
              <option value="search_email">Email</option>
          </select>

          {/* Input for search keyword */}
          <input
            type="text"
            placeholder={getPlaceholder()}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            required
            aria-label="Select keyword"
            >
          </input>

          {/* Buttons: only the search button is active for now */}
          <button type="submit">Search</button>
          <button type="button">Inactive</button>
          <button type="button">All</button>

        </form>
      </div>

      <div className="create-container">
        <button className="create-link" onClick={handleCreateClick}>
          Create Demographic
        </button>
      </div>

      <div className="results-container">
        {results.length > 0 ? (
          /* If search returned results show them in a table */
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>DOB</th>
                <th>Email</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {results.map((patient) => (
                <tr key={patient.id}>
                  <td>{patient.lastname}, {patient.firstname}</td>
                  <td>{formatPhone(patient.cellphone || patient.homephone || patient.workphone)} </td>
                  <td>{patient.dob ? patient.dob.slice(0, 10) : ''}</td>
                  <td>{patient.email}</td>
                  <td>{patient.patient_status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          /* No results */
          <p>No Results yet </p>
        )}
      </div>
    </>
  );
}

export default SearchPage;

