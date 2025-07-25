import React, { useEffect, useState } from 'react';
import './MainMenu.css';

/**
 * MainMenu component for rendering the primary layout and UI elements.
 * Includes EMR subbars, schedule time slots, and a form for posting data.
 */
function MainMenu() {

  /* Store the current time slot that was clicked for booking */
  const [selectedTime, setSelectedTime] = useState(null);

  /* Store and control whether the appt booking window is visible */
  const [showBookingWindow, setShowBookingWindow] = useState(false);

  /* Store the name of the pt entered in the booking window */
  const [patientName, setPatientName] = useState('');

  /* Store list of patient search matches returned from backend */
  const [searchResults, setSearchResults] = useState([]);

  /* Store patient selected from search results for booking */
  const [selectedPatient, setSelectedPatient] = useState([]);

  /* Store the current date, HARDCODE FOR NOW */
  const currentDate = '2025-06-27'; /* REPLACE WITH DYANMIC DATE LATER */

  /* Store the list of appointments retrieved from the backend server to display to the timesheet */
  const [appointments, setAppointments] = useState([]);

  /* Store the appointment duration time in minutes */
  const [duration, setDuration] = useState(15); /* 15 min default */

  /* Store the selected provider when booking an appt */
  const [selectedProviderId, setSelectedProviderId] = useState(null);


  /* Fetch the list of appointments whenever the date changes */
  const fetchAppointments = async () => {
    try {
      const response = await fetch(`http://localhost:3002/appointments?date=${currentDate}`);
      const data = await response.json();
      setAppointments(data);
    } catch (error) {
      console.error('Failed to fetch appointments:', error);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [currentDate]);


  /**
   * Handle the user click of the time slot
   */
  const handleTimeClick = (time, providerId) => {
    setSelectedTime(time);
    setSelectedProviderId(providerId);
    setShowBookingWindow(true);
  };

  /**
   * Handle the user creating the appointment time with patient name
   */
  const handleBookAppointment = async () => {

    /* If no selected time or no selected patient, there is an error */
    if (!selectedTime || !selectedPatient) {
      alert('Please select a time and a patient.');
      return;
    }

    /* Get the raw minutes since midnight, will make it easier to compare times */
    const selectedTimeRawMinutes = (parseInt(selectedTime.split(':')[0]) * 60) + parseInt(selectedTime.split(':')[1]);

    /* Check for time overlap */
    const ifConflict = appointments.some(appt => {

      const apptStart = (parseInt(appt.start_time.slice(0, 2)) * 60) + parseInt(appt.start_time.slice(3, 5));
      const apptEnd = apptStart + appt.duration;

      const selectedEnd = selectedTimeRawMinutes + duration;

      // if ((selectedEnd < apptStart) || (selectedTimeRawMinutes > apptEnd)) return false
      // else return true

      return selectedTimeRawMinutes < apptEnd && selectedEnd > apptStart;



    });

    if (ifConflict) {
      alert('This time slot is already booked for the selected provider');
      return;
    }

    const appointmentData = {
      patientId: selectedPatient.id,
      providerId: selectedProviderId,
      date: '2025-06-27', /* Hardcode date for now, make dynamically later */
      time: selectedTime,
      duration: duration,
      reason: 'General Consult', /* Hardcode for now */
      status: 'booked' /* Initial status is the patient is just booked */
    };

    try {
      const response = await fetch('http://localhost:3002/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(appointmentData)
      });

      const result = await response.json();

      if (!response.ok) {
        console.error(result.error);
        alert('Failed to book appointment');
      } else {
        console.log('Appointment booked:', result.message);
        alert('Appointment booked successfully');

        /* Fetch updated appointments */
        await fetchAppointments();

        /* Clear all the current booking info in the fields */
        setShowBookingWindow(false);
        setPatientName('');
        setSelectedPatient(null);
        setSearchResults([]);
      }

    } catch (error) {
      console.error('Booking failed', error);
      alert('Error booking appointment');
    };

    /* Fix logic later */
    console.log(`Booked ${patientName} at ${selectedTime}`);
    setShowBookingWindow(false);
    setPatientName('');
  };

  /**
   * Handle the patient search to call backend API
   */
  const handlePatientSearch = async (e) => {
    const keyword = e.target.value;
    setPatientName(keyword);

    try {
      const response = await fetch(`http://localhost:3002/patients/search?keyword=${encodeURIComponent(keyword)}&mode=search_name`);
      const data = await response.json();
      console.log('Search API response:', data);
      setSearchResults(data);
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  /**
   * Get the next status, after clicking the folder icon
   */
  const getNextStatus = (currentStatus) => {
    const statuses = ['booked', 'present', 'being_seen', 'finished', 'missed'];
    const currentStatusIndex = statuses.indexOf(currentStatus);

    if (currentStatusIndex === 4) return statuses[0];
    else return statuses[currentStatusIndex+1];
  }

  /**
   * Handle the folder icon being clicked, which means a change of patient appointment status
   * Send the updated status to the backend server with the appointment id and status
   */
  const handleStatusClick = async (apptId, currentStatus) => {
    const nextStatus = getNextStatus(currentStatus);

    try {
      const response = await fetch(`http://localhost:3002/appointments/${apptId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id: apptId, status: nextStatus})
      });

      const result = await response.json();

      if (!response.ok) {
        console.error(result.error);
        alert('Failed to update appointment status');
      } else {
        console.log(`Updated appointment ${apptId} status to ${nextStatus}`);

        /* Refresh the appointment list */
        await fetchAppointments();
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error updating appointment status');
    }
  };

  /**
   * Generate the 5 minute time slots from 7:00 AM to 23:55 PM for the schedule on given day on the UI
   * Also generate the appointment if they exist with the correct pt info
   */
  const generateTimeRows = () => {

    /* Holds all the <tr> rows for the schedule table */
    const rows = [];

    /* Tracks which times are covered by a rowSpan cell for each provider, when a cell spans multiple rows, the following time slots are hidden (no separate <tr> rendered) */
    const hiddenProvider1Rows = new Set();
    const hiddenProvider2Rows = new Set();
    
    /* Loop through each hour 7 AM to 11 PM */
    for (let hour = 7; hour <= 23; hour++) {
      /* Loop through each 5-min interval within hour */
      for (let min = 0; min <= 55; min+= 5) {

        /* format the hour and minute as a string (HH:MM) */
        const time = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
        
        /* Cells <td> for this specific row */
        const rowCells = [];

        /* --- Left time column --- */
        rowCells.push(
          <td key={`time-left-${time}`}
              className="time-cell clickable"
              onClick={() => handleTimeClick(time, 1)} /* Dr. Wong */
          >
            {time}
          </td>
        );

        /* --- Provider 1 column (Dr. Wong) --- */

        /* Check if this time slot is already covered by previous rowSpan cell for an already booked appt, if so move on */
        if (!hiddenProvider1Rows.has(time)) {
          
          /* Check to see if there is an appt for Dr. Wong starting at this time */
          const appt = appointments.find((appt) => appt.provider_name === 'Dr. Wong' && appt.start_time.slice(0, 5) === time);
          
          /* If the appt exists */
          if (appt) {

            /* Calculate how many 5-min rows this appt spans */
            const spanLength = appt.duration_minutes / 5;

            /* Mark future timeslots covered by this appt as hidden, so not rendered in future */
            for (let i = 1; i < spanLength; i++) {
              let futureMin = min + (i * 5);
              // const futureHour = hour + Math.floor(futureMin / 60);
              let futureHour = '';
              if (futureMin === 60) {
                futureHour = hour + 1;
                futureMin = 0;
              } else {
                futureHour = hour;
              }
              const futureTime = `${futureHour.toString().padStart(2, '0')}:${futureMin.toString().padStart(2, '0')}`;
              hiddenProvider1Rows.add(futureTime);
            }

            /* Render a single <td> cell with rowSpan = span to cover multiple rows vertically */
            /* This cell shows appointment info and the folder icon for appt status change */
            rowCells.push(
              <td 
                key={`provider1-${time}`}
                className={`slot-cell ${appt.status}-cell`}
                rowSpan={spanLength}
                style={{ verticalAlign: 'middle'}}
              >
                <strong>
                  <span
                    className="folder-icon"
                    onClick={() => handleStatusClick(appt.id, appt.status)}
                    style={{ cursor: 'pointer', marginRight: '5px'}}
                  >
                    📁
                  </span>
                  {appt.firstname} {appt.lastname} | {appt.reason}
                </strong>
              </td>
            );
          } else {
              /* No appt for Dr. Wong at this time */
              rowCells.push(
                <td key={`provider1-${time}`} className="slot-cell">-</td>
              )
          }
        }
        
      /* --- Right time column --- */
      rowCells.push(
        <td key={`time-right-${time}`}
            className="time-cell clickable"
            onClick={() => handleTimeClick(time, 2)} /* Dr. Smith */
        >
          {time}
        </td>
      );

      /* --- Provider 2 column (Dr. Smith) --- */

      /* Check if this time slot is already covered by previous rowSpan cell for an already booked appt, if so move on */
        if (!hiddenProvider2Rows.has(time)) {
          
          /* Check to see if there is an appt for Dr. Smith starting at this time */
          const appt = appointments.find((appt) => appt.provider_name === 'Dr. Smith' && appt.start_time.slice(0, 5) === time);
          
          /* If the appt exists */
          if (appt) {

            /* Calculate how many 5-min rows this appt spans */
            const spanLength = appt.duration_minutes / 5;

            /* Mark future timeslots covered by this appt as hidden, so not rendered in future */
            for (let i = 1; i < spanLength; i++) {
              let futureMin = min + (i * 5);
              // const futureHour = hour + Math.floor(futureMin / 60);
              let futureHour = '';
              if (futureMin === 60) {
                futureHour = hour + 1;
                futureMin = 0;
              } else {
                futureHour = hour;
              }
              const futureTime = `${futureHour.toString().padStart(2, '0')}:${futureMin.toString().padStart(2, '0')}`;
              hiddenProvider2Rows.add(futureTime);
            }

            /* Render a single <td> cell with rowSpan = span to cover multiple rows vertically */
            /* This cell shows appointment info and the folder icon for appt status change */
            rowCells.push(
              <td 
                key={`provider2-${time}`}
                className={`slot-cell ${appt.status}-cell`}
                rowSpan={spanLength}
                style={{ verticalAlign: 'middle'}}
              >
                <strong>
                  <span
                    className="folder-icon"
                    onClick={() => handleStatusClick(appt.id, appt.status)}
                    style={{ cursor: 'pointer', marginRight: '5px'}}
                  >
                    📁
                  </span>
                  {appt.firstname} {appt.lastname} | {appt.reason}
                </strong>
              </td>
            );
          } else {
              /* No appt for Dr. Smith at this time */
              rowCells.push(
                <td key={`provider2-${time}`} className="slot-cell">-</td>
              )
          }
        }

        rows.push(<tr key={time}>{rowCells}</tr>);

      }
    }

    /* Return all the table generated rows */
    return rows;
  };  



  // /**
  //  * Generate the 5 minute time slots from 7:00 AM to 23:55 PM for the schedule on given day on the UI
  //  * Also generate the appointment if they exist with the correct pt info
  //  */
  // const generateTimeRows = () => {
  //   const rows = [];

  //   for (let hour = 7; hour <= 23; hour++) {
  //     for (let min = 0; min <= 55; min+=5) {
  //       /* format the hour and minute as a string (HH:MM) */
  //       const time = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
        
  //       const provider1Appt = appointments.find(appt => appt.start_time.slice(0, 5) === time && appt.provider_name === 'Dr. Wong');
  //       const provider2Appt = appointments.find(appt => appt.start_time.slice(0, 5) === time && appt.provider_name === 'Dr. Smith');
        
  //       rows.push(
  //         <tr key={`${hour}-${min}`}>
  //           {/* Time Column Left */}
  //           <td className = "time-cell clickable" onClick={() => handleTimeClick(time)}>{time}</td>

  //           {/* 1st Doctor Provider Slot */}
  //           <td className={`slot-cell ${provider1Appt ? `${provider1Appt.status}-cell` : ''}`}>
  //             {provider1Appt ? (
  //               <strong>
  //                 <span
  //                   className="folder-icon"
  //                   onClick={() => handleStatusClick(provider1Appt.id, provider1Appt.status)}
  //                   style={{ cursor: 'pointer', marginRight: '5px' }}
  //                 >
  //                   📁
  //                 </span>
                  
  //                 {provider1Appt.firstname} {provider1Appt.lastname} | {provider1Appt.reason}
                  
  //               </strong>): '-'}
  //           </td>

  //           {/* Time Column Right */}
  //           <td className = "time-cell clickable" onClick={() => handleTimeClick(time)}>{time}</td>

  //           {/* 2nd Doctor Provider Slot */}
  //           <td className={`slot-cell ${provider2Appt ? `${provider2Appt.status}-cell` : ''}`}>
  //             {provider2Appt ? (
  //               <strong>
  //                 <span
  //                   className="folder-icon"
  //                   onClick={() => handleStatusClick(provider2Appt.id, provider2Appt.status)}
  //                   style={{ cursor: 'pointer', marginRight: '5px' }}
  //                 >
  //                   📁
  //                 </span>
  //                 {provider2Appt.firstname} {provider2Appt.lastname} | {provider2Appt.reason}
                
  //               </strong>) : '-'}
  //           </td>

  //         </tr>
  //       );

  //     }
  //   }
  //   return rows;
  // }




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

      {/* Schedule Table */}
      <div className="schedule-wrapper">
        <table className="schedule-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Provider 1</th>
              <th>Time</th>
              <th>Provider 2</th>
            </tr>
          </thead>
          <tbody>{generateTimeRows()}</tbody>
        </table>
      </div>

      {/* Show the popup window when trying to book an appt*/}
      {showBookingWindow && (
        <div className="popup-background">
          <div className="popup">
            <h2>Book Appointment for {selectedTime}</h2>
            <label>
              Duration:
              <select value={duration} onChange={(e) => setDuration(parseInt(e.target.value))}>
                <option value={5}>5 minutes</option>
                <option value={10}>10 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={20}>20 minutes</option>
                <option value={25}>25 minutes</option>
                <option value={30}>30 minutes</option>
              </select>
              Search Patient:
              <input type="text"
              value={patientName}
              onChange={handlePatientSearch}
              placeholder='Enter patient name'
              />
            </label>
            {selectedPatient && (<p>Selected: {selectedPatient.firstname} {selectedPatient.lastname}</p>)}
            {/* Show the search results in the popup window */}
            <ul className="search-results">
              {searchResults.map((patient) => (
                <li 
                  key={patient.id}
                  onClick={() => setSelectedPatient(patient)}
                  className="search-result-item"
                >
                  {patient.lastname}, {patient.firstname}
                </li>
              ))}
            </ul>
            <div className="popup-buttons">
              <button onClick={() => handleBookAppointment()}>Book</button>
              <button onClick={() => setShowBookingWindow(false)}>Cancel</button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default MainMenu;





