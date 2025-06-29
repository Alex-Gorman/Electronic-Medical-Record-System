// src/MainMenu/MainMenu.js

import React, { useState } from 'react';
import './MainMenu.css';

/**
 * MainMenu component for rendering the primary layout and UI elements.
 * Includes EMR subbars, schedule time slots, and a form for posting data.
 */
function MainMenu() {
  const [topic, setTopic] = useState('');
  const [data, setData] = useState('');

  /**
   * Handles input change for the Topic field.
   * @param {React.ChangeEvent<HTMLInputElement>} e - The change event.
   */
  const handleTopicChange = (e) => setTopic(e.target.value);

  /**
   * Handles input change for the Data field.
   * @param {React.ChangeEvent<HTMLTextAreaElement>} e - The change event.
   */
  const handleDataChange = (e) => setData(e.target.value);

  /**
   * Submits the Topic and Data to the server via a POST request.
   * @param {React.FormEvent<HTMLFormElement>} e - The form submit event.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch('http://localhost:3002/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Topic: topic, Data: data }),
      });

      if (response.ok) {
        console.log('Post created successfully.');
        setTopic('');
        setData('');
      } else {
        console.error('Failed to create a new post.');
      }
    } catch (error) {
      console.error('Error creating a new post:', error);
    }
  };

  /**
   * Generates time slots from 7:00 AM to 6:00 PM for scheduling UI.
   * @returns {JSX.Element[]} Array of time slot elements.
   */
  const generateTimeSlots = () => {
    const times = [];
    for (let hour = 7; hour <= 18; hour++) {
      const label = `${hour % 12 || 12}:00 ${hour < 12 ? 'AM' : 'PM'}`;
      times.push(<div className="time-slot" key={hour}>{label}</div>);
    }
    return times;
  };

  return (
    <div>
      {/* Top EMR Subbar */}
      <div className="oscar-subbar">
        <div className="subbar-left">
          <div className="emr-group">EMR Pro</div>
          <div className="search-section">
            <label htmlFor="search">Search:</label>
            <input
              type="text"
              id="search"
              placeholder="Enter Health Card # or Demographic Name"
            />
            <button className="go-button">GO</button>
          </div>
        </div>
        <div className="subbar-right">
          <button className="apps-button">APPS</button>
          <button className="portal-button">HELP PORTAL</button>
          <button className="tv-button">TEAMVIEWER</button>
        </div>
      </div>

      {/* Secondary Navigation Bar */}
      <div className="secondary-bar">
        <span className="location-label">Main Location</span>
        <div className="calendar-controls">
          <button className="nav-arrow">◀</button>
          <span className="current-date">Fri, 2025-06-27</span>
          <button className="nav-button">Calendar</button>
          <button className="nav-button">Schedule</button>
          <button className="nav-button">Today</button>
          <button className="nav-button">Month</button>
        </div>
        <span className="label-box">HCV</span>
      </div>

      {/* Schedule Columns */}
      <div className="schedule-columns">
        <div className="schedule-column">{generateTimeSlots()}</div>
        <div className="schedule-column">{generateTimeSlots()}</div>
      </div>

      {/* Data Entry Form */}
      <div className="main-menu">
        <form onSubmit={handleSubmit} className="post-form">
          <div className="form-group">
            <label htmlFor="topic">Topic:</label>
            <input
              type="text"
              id="topic"
              name="topic"
              value={topic}
              onChange={handleTopicChange}
              className="input-field"
            />
          </div>
          <div className="form-group">
            <label htmlFor="data">Data:</label>
            <textarea
              id="data"
              name="data"
              value={data}
              onChange={handleDataChange}
              className="input-field"
              rows="4"
            />
          </div>
          <button type="submit" className="submit-button">Submit</button>
        </form>
      </div>
    </div>
  );
}

export default MainMenu;





