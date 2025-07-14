// src/SearchPage/SearchPage.js

import React, { useState } from 'react';
import './SearchPage.css';

import { useNavigate } from 'react-router-dom';

import CreateDemographic from '../CreateDemographic/CreateDemographic';




function SearchPage() {
  const [keyword, setKeyword] = useState('');
  const [searchMode, setSearchMode] = useState('search_name');
  const [results, setResults] = useState([]);
  const navigate = useNavigate();

  /**
   * Handles form submission for patient search.
   * Sends a GET request to the backend with the search keyword,
   * then displays matching results in the table below.
   */
  const handleSubmit = async (e) => {
    // Prevent the default form submission behavior (page reload)
    e.preventDefault();

    // Only "search_name" is implemented for now — other modes show an alert
    if (searchMode !== 'search_name') {
      alert('Only name search is implemented in demo.');
      return;
    }

    try {
      // Encode the keyword and send it to the backend API via a GET request
      const res = await fetch(
        `http://localhost:3002/patients/search?keyword=${encodeURIComponent(keyword)}`
      );

      // Parse the JSON response
      const data = await res.json();

      // Handle HTTP errors
      if (!res.ok) {
        alert(data.error || 'Search failed');
        return;
      }

    // If successful, store the result in component state to render the table
    setResults(data);
    } catch (err) {
    // Log unexpected errors and notify the user
    console.error(err);
    alert('Failed to fetch results');
  }
};


  /**
   * Handles the "Create Demographic" button click.
   * Currently displays a placeholder alert.
   */
  /*const handleCreateClick = () => {
    window.location.href = '/create-demographic';
  }; */

  const handleCreateClick = () => {
    /* window.open('/create-demographic', 'CreateDemographic', 'width=1000,height=800'); */
    navigate('/create-demographic');
  };


  /**
  * Formats a 10-digit phone number as XXX-XXX-XXXX
  */
  function formatPhone(number) {
    if (!number) return '';
    const cleaned = number.replace(/\D/g, ''); // Remove non-digit characters
    if (cleaned.length !== 10) return number;  // Fallback if not 10 digits
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }

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
          
          {/* Dropdown to select search mode (currently only 'Name' is implemented) */}
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

          {/* Input for search keyword (e.g., part of the name) */}
          <input
            type="text"
            placeholder="Last, First"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            required
            aria-label="Search keyword"
          />

          {/* Action buttons: only Search is functional for now */}
          <button type="submit">Search</button>
          <button type="button">Inactive</button>
          <button type="button">All</button>
        </form>
      </div>

      {/* "Create Demographic" section — placeholder for future feature */}
      <div className="create-container">
        <button className="create-link" onClick={handleCreateClick}>
          Create Demographic
        </button>
      </div>

      {/* Section to display search results */}
      <div className="results-container">
        {results.length > 0 ? (
          // If search returned results, show them in a table
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
                  <td>{formatPhone(patient.cellphone || patient.homephone)}</td>
                  <td>{patient.dob ? patient.dob.slice(0, 10) : ''}</td>
                  <td>{patient.email}</td>
                  <td>{patient.patient_status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          // If no results yet, display a message
          <p>No results yet.</p>
        )}
      </div>
    </>
);

}

export default SearchPage;

