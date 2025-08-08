// import React, { useEffect, useState } from 'react';
// import './MainMenu.css';
// import AppointmentFormPopup from '../Components/AppointmentFormPopup';
// import DatePicker from 'react-datepicker';
// import 'react-datepicker/dist/react-datepicker.css';
// import { useNavigate, useLocation } from 'react-router-dom';

import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './MainMenu.css';
import AppointmentFormPopup from '../Components/AppointmentFormPopup';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

/**
 * MainMenu component for rendering the primary layout and UI elements.
 * Includes EMR subbars, schedule time slots, and a form for posting data.
 */
function MainMenu() {
  /* Store the current date, HARDCODE FOR NOW */
  // const currentDate = '2025-06-27'; /* REPLACE WITH DYANMIC DATE LATER */

  const { search } = useLocation();
  const navigate   = useNavigate();
  const params     = new URLSearchParams(search);

  // **1. Read the raw “YYYY-MM-DD” string from the URL**
  const dateParam = params.get('date');

  // **2. Parse it as a local date** (so you don’t get a UTC shift)
  const [currentDate, setCurrentDate] = useState(() => {
    if (dateParam) {
      const [y, m, d] = dateParam.split('-').map(Number);
      return new Date(y, m - 1, d);
    } else {
      return new Date();
    }
  });

  // whenever date changes, update URL and refetch
  useEffect(() => {
    // const iso = currentDate.toISOString().slice(0,10);
    const iso = currentDate.toLocaleDateString('en-CA').slice(0,10); 
    // push into URL (replace so it doesn’t add history entries)
    navigate(`?date=${iso}`, { replace: true });
    setShowCalendar(false);
    fetchAppointments();
  }, [currentDate, navigate]);

  // // 1) read from query
  //   const params = new URLSearchParams(window.location.search)
  //   const [currentDate, setCurrentDate] = useState(() => {
  //     const d = params.get('date')
  //     return d ? new Date(d) : new Date()
  //   })

  //   // 2) whenever you set it, also push into URL
  //   useEffect(() => {
  //     const iso = currentDate.toISOString().slice(0,10)
  //     history.replace({ search: `?date=${iso}` })
  //     // …then fetchAppointments()…
  //   }, [currentDate, navigate]);


  // const [currentDate, setCurrentDate] = useState(() => new Date());

  /* Store the list of appointments retrieved from the backend server to display to the timesheet */
  const [appointments, setAppointments] = useState([]);

  /* Calendar */
  const [showCalendar, setShowCalendar] = useState(false);

  const [doctors, setDoctors] = useState([]);

  // then add a useEffect to grab them once:
  useEffect(() => {
    async function loadDoctors() {
      try {
        const res = await fetch('http://localhost:3002/doctors');
        const list = await res.json();
        setDoctors(list);
      } catch (e) {
        console.error("Failed to load doctors", e);
      }
    }
    loadDoctors();
  }, []);

  // useEffect(() => {
  //   const handler = event => {
  //     const msg = event.data;
  //     if (msg?.type === 'date-selected' && msg.timestamp) {
  //       setCurrentDate(new Date(msg.timestamp));
  //     }
  //     if (msg?.type === 'appointment-added') {
  //       // 1) switch the calendar to the date you just booked on
  //       // setCurrentDate(new Date(msg.date));
  //       setCurrentDate(new Date(msg.date + 'T00:00'));
  //       // 2) then fetch that day’s appointments
  //       fetchAppointments();
  //     }
  //     if (msg?.type === 'appointment-deleted') {
  //       fetchAppointments();
  //     }
  //   };

  //   window.addEventListener('message', handler);
  //   return () => window.removeEventListener('message', handler);
  // }, []);

  useEffect(() => {
    const handler = (event) => {
      const msg = event.data;
      if (msg?.type === 'appointment-deleted') {
        const deletedId = String(msg.apptId);
        const viewDateIso = currentDate.toLocaleDateString('en-CA').slice(0,10);

        // only update if the message is for the date we’re viewing
        if (!msg.date || msg.date === viewDateIso) {
          setAppointments(prev => prev.filter(a => String(a.id) !== deletedId));
        }

        // optional safety net: do a refetch in background
        fetchAppointments();
      }

      if (msg?.type === 'appointment-added') {
        fetchAppointments();
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [currentDate]);



  // /* Take a message from the add appointment window to refresh the timesheet and grab all new appointments */
  // useEffect(() => {
  //   const handleMessage = (event) => {
  //     if (event.data === 'appointment-added' || event.data === 'appointment-deleted') {
  //       fetchAppointments();
  //     }
  //   };
  //   window.addEventListener('message', handleMessage);
  //   return () => {
  //     window.removeEventListener('message', handleMessage);
  //   };
  // }, []);

  // useEffect(() => {
  //   const handler = event => {
  //     if (event.data?.type === 'date-selected' && event.data.timestamp) {
  //       setCurrentDate(new Date(event.data.timestamp));
  //     }
  //     if (event.data === 'appointment-added' || event.data === 'appointment-deleted') {
  //         fetchAppointments();
  //       }
  //   };
  //   window.addEventListener('message', handler);
  //   return () => window.removeEventListener('message', handler);
  // }, []);


  /* Fetch the list of appointments whenever the date changes */
  const fetchAppointments = async () => {
    // const isoDate = currentDate.toISOString().slice(0,10); /* “2025-08-06” */
    const isoDate = currentDate.toLocaleDateString('en-CA').slice(0,10); 
    try {
      const response = await fetch(`http://localhost:3002/appointments?date=${isoDate}`);
      const data = await response.json();
      setAppointments(data);
    } catch (error) {
      console.error('Failed to fetch appointments:', error);
    }
  };

  useEffect(() => {
    fetchAppointments();
    setShowCalendar(false);
  }, [currentDate]);

  // useEffect(() => {
  //   const handler = event => {
  //     if (event.data?.type === 'date-selected' && event.data.timestamp) {
  //       setCurrentDate(new Date(event.data.timestamp));
  //     }
  //     if (event.data === 'appointment-added' || event.data === 'appointment-deleted') {
  //         fetchAppointments();
  //       }
  //   };
  //   window.addEventListener('message', handler);
  //   return () => window.removeEventListener('message', handler);
  // }, []);


  // useEffect(() => {
  //   const handler = event => {
  //     if (event.data?.type === 'date-selected') {
  //       setCurrentDate(new Date(event.data.date));
  //     }
  //     if (event.data === 'appointment-added' || event.data === 'appointment-deleted') {
  //       fetchAppointments();
  //     }
  //   };
  //   window.addEventListener('message', handler);
  //   return () => window.removeEventListener('message', handler);
  // }, []);


  const handlePrevDay = () => {
    setCurrentDate(d => {
      const prev = new Date(d);
      prev.setDate(prev.getDate() - 1);
      return prev;
    });
  };

  const handleNextDay = () => {
    setCurrentDate(d => {
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      return next;
    });
  };

  const handleToday = () => {
    setCurrentDate(() => new Date()); 
  };

  const handleCalendarToggle = () => {
    setShowCalendar(open => !open);
  };

  const handleCalendarOpen = () => {
    // opens a *new* browser window/tab at /calendar-popup
    window.open(
      '/calendar-popup',
      'Calendar',
      'width=320,height=360,resizable,scrollbars'
    );
  };




  /**
   * Handle the user click of the time slot
   */
  const handleTimeClick = (time, providerId) => {

    /* Current date, “2025-08-06” */
    // const isoDate = currentDate.toISOString().slice(0,10);
    const isoDate = currentDate.toLocaleDateString('en-CA').slice(0,10); 

    /* Query string with the info to be passed to the popup window */
    const popupURL = `/appointment-form-popup?time=${encodeURIComponent(time)}&providerId=${providerId}&mode=add&date=${isoDate}`;

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
   * Handle e-chart click
   */
  const handleEchartClick = async(appt) => {
    const patientId = appt.patient_id;

    /* Query string with the info to be passed to the popup window */
    const popupURL = `/casemgmt?patientId=${encodeURIComponent(patientId)}`

    /* Open the popup e-chart record for the given patient */
    /* ENCOUNTER - LASTNAME, FIRSTNAME SEX AGE years */
    window.open(popupURL, 'ENCOUNTER - LASTNAME, FIRSTNAME SEX AGE years', 'width=600,height=550');
  }

  /**
   * Handle billing click
   */
  const handleBillingClick = async(appt) => {
    const patientId = appt.patient_id;

    /* Query string with the info to be passed to the popup window */
    const popupURL = `/billing?patientId=${encodeURIComponent(patientId)}`

    /* Open the popup e-chart record for the given patient */
    window.open(popupURL, 'Ontario Billing', 'width=600,height=550');
  }



  /**
   * Handle master record click
   */
  const handleMasterRecordClick = async(appt) => {
    const patientId = appt.patient_id;

    /* Query string with the info to be passed to the popup window */
    const popupURL = `/demographic?patientId=${encodeURIComponent(patientId)}`;

    /* Open the popup master record demographic for the given patient */
    // window.open(popupURL, 'PATIENT DETAIL INFO', 'width=950,height=22250');
    window.open(popupURL, '_blank', 'width=950,height=800,resizable=yes,scrollbars=yes');
  }

  /**
   * Handle Rx button click
   */
  const handleRxClick = async(appt) => {
    const patientId = appt.patient_id;

    /* Query string with the info to be passed to the popup window */
    const popupURL = `/Rx?patientId=${encodeURIComponent(patientId)}`;

    /* Open the popup master record demographic for the given patient */
    window.open(popupURL, 'PATIENT DRUG PROFILE', 'width=600,height=550');
  }



  /**
   * Handle editing an appointment after clicking on a patients name on the timesheet
   */
  const handleEditAppointment = async (time, providerId, appt) => {

    /* Current date, “2025-08-06” */
    // const isoDate = currentDate.toISOString().slice(0,10);
    const isoDate = currentDate.toLocaleDateString('en-CA').slice(0,10); 

    /* Query string with the info to be passed to the popup window */
    // const popupURL = `/appointment-form-popup?time=${encodeURIComponent(time)}&providerId=${providerId}&mode=edit&apptId=${appt.id}`;

    /* Query string with the info to be passed to the popup window */
    const popupURL = `/appointment-form-popup?time=${encodeURIComponent(time)}&providerId=${providerId}&mode=edit&apptId=${appt.id}&date=${isoDate}`;

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

        /* 1. */
        /* --- Left time column --- */
        // rowCells.push(
        //   <td key={`time-left-${time}`}
        //       className="time-cell clickable"
        //       onClick={() => handleTimeClick(time, 1)} /* Dr. Wong */
        //   >
        //     {time}
        //   </td>
        // );

        if (!hiddenProvider1Rows.has(time)) {
          rowCells.push(
            <td key={`time-left-${time}`}
              className="time-cell clickable"
              onClick={() => handleTimeClick(time, 1)}
            >
              {time}
            </td>
          );
        } else {
          rowCells.push(
          <td key={`time-left-${time}`} className="time-cell disabled">
          {time}
          </td>
          );
        }

        /* --- Provider 1 column (Dr. Wong) --- */

        /* Check if this time slot is already covered by previous rowSpan cell for an already booked appt, if so move on */
        if (!hiddenProvider1Rows.has(time)) {
          
          /* Check to see if there is an appt for Dr. Wong starting at this time */
          const appt = appointments.find((appt) => appt.provider_name === 'Dr. Wong' && appt.start_time.slice(0, 5) === time);
          
          /* If the appt exists */
          if (appt) {

            /* Calculate how many 5-min rows this appt spans */
            const spanLength = appt.duration_minutes / 5;

            // hide the start…
            // hiddenProvider1Rows.add(time);

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
                    <span className="folder-icon" onClick={() => handleStatusClick(appt.id, appt.status)} style={{ cursor: 'pointer', marginRight: '5px'}} > 📁 </span>
                    <span className="patient-name" onClick={() => { handleEditAppointment(time, 1, appt); }} style = {{ cursor: 'pointer' }}> {appt.firstname} {appt.lastname} </span>
                    <span>|</span>
                    <span onClick={() => {handleEchartClick(appt);}} style = {{ cursor: 'pointer' }}>E</span>
                    <span>|</span>
                    <span onClick={() => {handleBillingClick(appt);}} style = {{ cursor: 'pointer' }}>-B</span>
                    <span>|</span>
                    <span onClick={() => {handleMasterRecordClick(appt);}} style = {{ cursor: 'pointer' }}>M</span>
                    <span>|</span>
                    <span onClick={() => {handleRxClick(appt);}} style = {{ cursor: 'pointer' }}>Rx</span> 
                    <span>|</span> 
                    <span><em>{appt.reason}</em></span>   

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
        
      // /* --- Right time column --- */
      // rowCells.push(
      //   <td key={`time-right-${time}`}
      //       className="time-cell clickable"
      //       onClick={() => handleTimeClick(time, 2)} /* Dr. Smith */
      //   >
      //     {time}
      //   </td>
      // );

      if (!hiddenProvider2Rows.has(time)) {
          rowCells.push(
            <td key={`time-right-${time}`}
              className="time-cell clickable"
              onClick={() => handleTimeClick(time, 2)}
            >
              {time}
            </td>
          );
        } else {
          rowCells.push(
          <td key={`time-right-${time}`} className="time-cell disabled">
          {time}
          </td>
          );
        }

      /* --- Provider 2 column (Dr. Smith) --- */

      /* Check if this time slot is already covered by previous rowSpan cell for an already booked appt, if so move on */
        if (!hiddenProvider2Rows.has(time)) {
          
          /* Check to see if there is an appt for Dr. Smith starting at this time */
          const appt = appointments.find((appt) => appt.provider_name === 'Dr. Smith' && appt.start_time.slice(0, 5) === time);
          
          /* If the appt exists */
          if (appt) {

            /* Calculate how many 5-min rows this appt spans */
            const spanLength = appt.duration_minutes / 5;

            // hide the start…
            // hiddenProvider2Rows.add(time);h

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
                    <span className="folder-icon" onClick={() => handleStatusClick(appt.id, appt.status)} style={{ cursor: 'pointer', marginRight: '5px'}} > 📁 </span>
                    <span className="patient-name" onClick={() => { handleEditAppointment(time, 2, appt); }} style = {{ cursor: 'pointer' }} > {appt.firstname} {appt.lastname} </span>
                    <span>|</span>
                    <span onClick={() => {handleEchartClick(appt);}} style = {{ cursor: 'pointer' }}>E</span>
                    <span>|</span>
                    <span onClick={() => {handleBillingClick(appt);}} style = {{ cursor: 'pointer' }}>-B</span>
                    <span>|</span>
                    <span onClick={() => {handleMasterRecordClick(appt);}} style = {{ cursor: 'pointer' }}>M</span>
                    <span>|</span>
                    <span onClick={() => {handleRxClick(appt);}} style = {{ cursor: 'pointer' }}>Rx</span> 
                    <span>|</span> 
                    <span><em>{appt.reason}</em></span>   

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
          {/* <div className="emr-group">EMR Pro</div> */}
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
          {/* <button className="apps-button">APPS</button>
          <button className="portal-button">HELP PORTAL</button>
          <button className="tv-button">TEAMVIEWER</button> */}
        </div>
      </div>

      {/* Secondary Navigation Bar */}
      <div className="secondary-bar">
        {/* <span className="location-label">Main Location</span> */}

        <div className="calendar-controls">
          <button className="nav-arrow" onClick={handlePrevDay}>◀</button>
          <span className="current-date">{currentDate.toLocaleDateString('en-US',{ weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} </span>
          <button className="nav-arrow" onClick={handleNextDay}>▶</button>
          <button className="nav-button" onClick={handleCalendarOpen}>Calendar</button>
          {/* <button className="nav-button">Schedule</button> */}
          <button className="nav-button" onClick={handleToday}>Today</button>
          {/* <button className="nav-button">Month</button> */}
        </div>

        {showCalendar && (
            <div className="date-picker-popup">            
              <DatePicker
                inline
                selected={currentDate}
                onChange={d => setCurrentDate(d)}
              />
            </div>
        )}

        {/* <span className="label-box">HCV</span> */}
      </div>

      {/* Schedule Table */}
      <div className="schedule-wrapper">
        <table className="schedule-table">
          <thead>
            <tr>
              <th className="time-col">Time</th>
              {/* <th className="provider-col">Provider 1</th> */}
              <th className="provider-col">{doctors[0] ?? 'Provider 1'}</th>
              <th className="time-col">Time</th>
              {/* <th className="provider-col">Provider 2</th> */}
              <th className="provider-col">{doctors[1] ?? 'Provider 2'}</th>
            </tr>
          </thead>
          <tbody>{generateTimeRows()}</tbody>
        </table>
      </div>
    </div>
  );
}

export default MainMenu;





