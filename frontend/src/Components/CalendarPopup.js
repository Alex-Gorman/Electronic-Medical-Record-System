// src/CalendarPopup.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

export default function CalendarPopup() {
    const [date, setDate] = useState(new Date());
    const navigate = useNavigate();

    const onSelect = d => {
        window.opener.postMessage(
            { type: 'date-selected', timestamp: d.getTime() },
            '*'
        );
        window.close();
    };


  return (
    <div style={{ padding: 20 }}>
      <h3>Select a date</h3>
      <DatePicker
        inline
        selected={date}
        onChange={d => setDate(d)}
        onSelect={onSelect}
      />
    </div>
  );
}
