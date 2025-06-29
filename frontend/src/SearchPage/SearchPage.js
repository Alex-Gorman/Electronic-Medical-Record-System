// src/SearchPage/SearchPage.js

import React, { useState } from 'react';
import './SearchPage.css';

function SearchPage() {
  const [keyword, setKeyword] = useState('');
  const [searchMode, setSearchMode] = useState('search_name');

  /**
   * Handles form submission for patient search.
   * Constructs a URL with query parameters and redirects to the results page.
   */
  const handleSubmit = (e) => {
    e.preventDefault();

    const encodedKeyword = encodeURIComponent(keyword).replace(/%20/g, '+');
    const resultUrl = `/oscar/demographic/demographiccontrol.jsp?search_mode=${searchMode}&keyword=${encodedKeyword}&orderby=last_name`;

    window.location.href = resultUrl;
  };

  /**
   * Handles the "Create Demographic" button click.
   * Currently displays a placeholder alert.
   */
  const handleCreateClick = () => {
    alert('Create Demographic clicked!');
    // Future: Open create demographic modal or redirect to creation page.
  };

  return (
    <>
      {/* Header and Search Form Container */}
      <div className="search-container">
        <div className="search-header">
          <h1>Patient Search</h1>
          <div className="header-links">
            <span>Help</span> | <span>About</span>
          </div>
        </div>

        <form className="search-form" onSubmit={handleSubmit}>
          {/* Search Mode Selector */}
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

          {/* Keyword Input */}
          <input
            type="text"
            placeholder="Last, First"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            required
            aria-label="Search keyword"
          />

          {/* Action Buttons */}
          <button type="submit">Search</button>
          <button type="button">Inactive</button>
          <button type="button">All</button>
        </form>
      </div>

      {/* Create Demographic Action */}
      <div className="create-container">
        <button className="create-link" onClick={handleCreateClick}>
          Create Demographic
        </button>
      </div>
    </>
  );
}

export default SearchPage;

