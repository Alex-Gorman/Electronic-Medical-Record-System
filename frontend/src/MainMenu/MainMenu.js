import React, { useEffect, useState } from 'react';
import './MainMenu.css';
import AppointmentFormPopup from '../Components/AppointmentFormPopup';

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

  /* Track the selected appointment */
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  /* Track the appointment reason */
  const [appointmentReason, setAppointmentReason] = useState('');

  /* Popup window */
  const [popupVisible, setPopupVisible] = useState(false);

  /* Take a message from the add appointment window to refresh the timesheet and grab all new appointments */
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data === 'appointment-added' || event.data === 'appointment-deleted') {
        fetchAppointments();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  /* Reset booking state values */
  const resetBookingState = () => {
    setSelectedTime(null);
    setShowBookingWindow(false);
    setPatientName('');
    setSearchResults([]);
    setSelectedPatient(null);
    setSelectedProviderId(null);
    setSelectedAppointment(null);
    setAppointmentReason('');
  }


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
    resetBookingState();
    setSelectedTime(time);
    setSelectedProviderId(providerId);
    // setShowBookingWindow(true);
    console.log("GOT HERE 1");

    /* Query string with the info to be passed to the popup window */
    const popupURL = `/appointment-form-popup?time=${encodeURIComponent(time)}&providerId=${providerId}&mode="add"`;

    /* Open the popup appointment form window */
    window.open(popupURL, 'ADD APPOINTMENT', 'width=600,height=550');


    // setPopupVisible(true);
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

    /* Fetch fresh appointments directly from backend */
    let freshAppointments = [];
    try {
      const response = await fetch(`http://localhost:3002/appointments?date=${currentDate}`);
      freshAppointments = await response.json();
    } catch (error) {
      console.error('Error fetching appointments for conflict check:', error);
      alert('Unable to verify appointment conflicts');
      return;
    }

    /* Get the raw minutes since midnight, will make it easier to compare times */
    const selectedTimeRawMinutes = (parseInt(selectedTime.split(':')[0]) * 60) + parseInt(selectedTime.split(':')[1]);

    let isConflict = false;

    for (const appt of freshAppointments) {

      /* Appointment start for current appt being checked */
      const apptStart = (parseInt(appt.start_time.slice(0, 2)) * 60) + parseInt(appt.start_time.slice(3, 5));

      /* Appointment end for current appt being checked */
      const apptEnd = apptStart + appt.duration_minutes;

      /* Appointment start for appointment trying to be booked */
      const selectedStart = selectedTimeRawMinutes;

      /* Appointment end for appointment trying to be booked */
      const selectedEnd = selectedStart + duration;

      if ((selectedStart > apptStart) && (selectedStart < apptEnd)) {
        console.log("Time conflict scenario 1");
        isConflict = true;
      }

      if ((selectedEnd > apptStart) && (selectedEnd < apptEnd)) {
        console.log("Time conflict scenario 2");
        isConflict = true;
      }

      if ((selectedStart < apptStart) && (selectedEnd > apptEnd)) {
        console.log("Time conflict scenario 3");
        isConflict = true;
      }

      if ((selectedStart > apptStart) && (selectedEnd < apptEnd)) {
        console.log("Time conflict scenario 4");
        isConflict = true;
      }
    }

    console.log("isConflict? : "+isConflict);

    if (isConflict) {
      alert('This time slot is already booked for the selected provider');
      return;
    }

    /* If the appointment reason is empty, just make the default reason for the appt a 'General Consult' */
    if (appointmentReason === '') setAppointmentReason('General Consult');

    const appointmentData = {
      patientId: selectedPatient.id,
      providerId: selectedProviderId,
      date: '2025-06-27', /* Hardcode date for now, make dynamically later */
      time: selectedTime,
      duration: duration,
      reason: appointmentReason,
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
        resetBookingState();
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
      setSearchResults(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
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
   * Handle editing an appointment after clicking on a patients name on the timesheet
   */
  const handleEditAppointment = async (time, providerId, appt) => {
    resetBookingState();
    setSelectedTime(time);
    setSelectedProviderId(providerId);
    // setSelectedAppointment(appt);
    // setShowBookingWindow(true);
    console.log("GOT HERE 1");

    /* Query string with the info to be passed to the popup window */
    const popupURL = `/appointment-form-popup?time=${encodeURIComponent(time)}&providerId=${providerId}&mode=edit&apptId=${appt.id}`;

    /* Open the popup appointment form window */
    window.open(popupURL, 'EDIT APPOINTMENT', 'width=600,height=550');
  }

  /**
   * Handle deleting an appointment after clicking on a patients name on the timesheet
   */
  const handleDeleteAppointment = async (apptId) => {

    /* Remove the selected appointment and set it to no selected appt (null) */
    setSelectedAppointment(null);

    try {
      const response = await fetch(`http://localhost:3002/appointments/${apptId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id : apptId})
      });

      const result = await response.json();

      if (!response.ok) {
        console.error(result.error);
        alert('Failed to delete appointment');
      } else {
        console.log('Deleted appointment');
      }

      /* Clear all the current booking info in the fields */
      resetBookingState();

      /* Refresh the appointment list */
      await fetchAppointments();

    } catch (error) {
      console.error('Error deleting appointment:', error);
      alert('Error deleting appointment');
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
                  <div className="appt-info">
                    <span
                      className="folder-icon"
                      onClick={() => handleStatusClick(appt.id, appt.status)}
                      style={{ cursor: 'pointer', marginRight: '5px'}}
                    >
                      📁
                    </span>

                    <span
                      className="patient-name"
                      onClick={() => {
                        setSelectedTime(appt.start_time.slice(0,5));
                        setSelectedProviderId(appt.provider_id);
                        setSelectedPatient({
                          id: appt.patient_id,
                          firstname: appt.firstname,
                          lastname: appt.lastname,
                        });
                        setSelectedAppointment(appt);
                        setShowBookingWindow(true);
                        handleEditAppointment(time, 1, appt);
                      }}
                      style = {{ cursor: 'pointer' }}
                    >
                      {appt.firstname} {appt.lastname} | E | -B | M | Rx | {appt.reason}
                    </span>
                  </div>
                </strong>
              </td>
            );
          } else {
              /* No appt for Dr. Wong at this time */
              rowCells.push(
                <td key={`provider1-${time}`} className="slot-cell"></td>
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
                  <div className="appt-info">
                    <span
                      className="folder-icon"
                      onClick={() => handleStatusClick(appt.id, appt.status)}
                      style={{ cursor: 'pointer', marginRight: '5px'}}
                    >
                      📁
                    </span>

                    <span
                      className="patient-name"
                      onClick={() => {
                        setSelectedTime(appt.start_time.slice(0,5));
                        setSelectedProviderId(appt.provider_id);
                        setSelectedPatient({
                          id: appt.patient_id,
                          firstname: appt.firstname,
                          lastname: appt.lastname,
                        });
                        setSelectedAppointment(appt);
                        setShowBookingWindow(true);
                        handleEditAppointment(time, 2);
                      }}
                      style = {{ cursor: 'pointer' }}
                    >
                      {appt.firstname} {appt.lastname} | E | -B | M | Rx | {appt.reason}
                    </span>
                  </div>  
                </strong>
              </td>
            );
          } else {
              /* No appt for Dr. Smith at this time */
              rowCells.push(
                <td key={`provider2-${time}`} className="slot-cell"></td>
              )
          }
        }

        rows.push(<tr key={time}>{rowCells}</tr>);

      }
    }

    /* Return all the table generated rows */
    return rows;
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

      {/* Schedule Table */}
      <div className="schedule-wrapper">
        <table className="schedule-table">
          <thead>
            <tr>
              <th className="time-col">Time</th>
              <th className="provider-col">Provider 1</th>
              <th className="time-col">Time</th>
              <th className="provider-col">Provider 2</th>
            </tr>
          </thead>
          <tbody>{generateTimeRows()}</tbody>
        </table>
      </div>

      {/* Show the popup window when trying to book an appt*/}
      {/* {showBookingWindow && (
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
            {selectedPatient && (<p>Selected: {selectedPatient.firstname} {selectedPatient.lastname}</p>)} */}
            {/* Show the search results in the popup window */}
            {/* <ul className="search-results">
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
            <label>
              Reason:
              <input
                type="text"
                value={appointmentReason}
                onChange={(e) => setAppointmentReason(e.target.value)}
                placeholder='Give reason for appointment'
              />
            </label>
            <div className="popup-buttons">
              <button onClick={() => handleBookAppointment()}>Book</button>
              <button onClick={() => setShowBookingWindow(false)}>Cancel</button>
              {selectedAppointment && (
                <button onClick={() => handleDeleteAppointment(selectedAppointment.id)}>Delete</button>
              )}
            </div>

          </div>
        </div>
      )} */}

      {/* Show the popup window */}
      {/* {popupVisible && (
        <AppointmentFormPopup
          visible={true}
          mode={'add'}
          selectedTime={selectedTime}


          onClose={() => setPopupVisible(false)}

        />
      )} */}

    </div>
  );
}

export default MainMenu;





