import React, { useEffect, useState } from 'react';
import './MainMenu.css';
import AppointmentFormPopup from '../Components/AppointmentFormPopup';

/**
 * MainMenu component for rendering the primary layout and UI elements.
 * Includes EMR subbars, schedule time slots, and a form for posting data.
 */
function MainMenu() {
  /* Store the current date, HARDCODE FOR NOW */
  const currentDate = '2025-06-27'; /* REPLACE WITH DYANMIC DATE LATER */

  /* Store the list of appointments retrieved from the backend server to display to the timesheet */
  const [appointments, setAppointments] = useState([]);

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

    /* Query string with the info to be passed to the popup window */
    const popupURL = `/appointment-form-popup?time=${encodeURIComponent(time)}&providerId=${providerId}&mode="add"`;

    /* Open the popup appointment form window */
    window.open(popupURL, 'ADD APPOINTMENT', 'width=600,height=550');
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

    /* Query string with the info to be passed to the popup window */
    const popupURL = `/appointment-form-popup?time=${encodeURIComponent(time)}&providerId=${providerId}&mode=edit&apptId=${appt.id}`;

    /* Open the popup appointment form window */
    window.open(popupURL, 'EDIT APPOINTMENT', 'width=600,height=550');
  }

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
                        handleEditAppointment(time, 2, appt);
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
    </div>
  );
}

export default MainMenu;





