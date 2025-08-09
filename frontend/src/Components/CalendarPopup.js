/**
 * @file CalendarPopup.js
 * @module CalendarPopup
 * @description
 * Small popup that lets the user pick a date and sends it back to the opener
 * window as a local `YYYY-MM-DD` string.
 *
 * @fires window#message - Posts `{ type: 'date-selected', date: 'YYYY-MM-DD' }` to `window.opener`.
 *
 * @example
 * // From the parent window:
 * window.open('/calendar-popup', 'Calendar', 'width=360,height=420');
 * window.addEventListener('message', (e) => {
 *   if (e.data?.type === 'date-selected') {
 *     console.log('Picked date:', e.data.date); // e.g., "2025-08-08"
 *   }
 * });
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';


/**
 * Format a Date as **local** `YYYY-MM-DD` (no timezone shift).
 * @param {Date} d - JavaScript Date object.
 * @returns {string} Local date string in `YYYY-MM-DD` format.
 */
function formatAsYMD(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * CalendarPopup component.
 *
 * Renders an inline date picker and, when a date is selected, posts a message
 * back to the opener window with the selected date as `YYYY-MM-DD`, then closes itself.
 *
 * @component
 * @returns {JSX.Element}
 */
export default function CalendarPopup() {
  /** @type {[Date, React.Dispatch<React.SetStateAction<Date>>]} */
  const [date, setDate] = useState(new Date());

  /* Reserved in case you later want to navigate instead of closing */
  const navigate = useNavigate(); // eslint-disable-line no-unused-vars

  /**
   * Handle day selection from the calendar.
   * Sends `{ type: 'date-selected', date: 'YYYY-MM-DD' }` to the opener window.
   * @param {Date} d - Date selected by the user.
   */
  const onSelect = (d) => {
    const ymd = formatAsYMD(d);
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage({ type: 'date-selected', date: ymd }, '*');
    }
    window.close();
  };

  return (
    <div style={{ padding: 20 }}>
      <h3>Select a date</h3>
      <DatePicker
        inline
        selected={date}
        onChange={(d) => setDate(d)}
        onSelect={onSelect}
      />
    </div>
  );
}

