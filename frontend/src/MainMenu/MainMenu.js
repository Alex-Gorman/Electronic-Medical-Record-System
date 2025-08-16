/**
 * @file MainMenu.js
 * @module MainMenu
 *
 * Day view for two providers (e.g., Dr. Wong / Dr. Smith) showing 5-minute slots
 * from 07:00 to 23:55. Supports:
 * - Clicking a time slot to open the Add Appointment popup.
 * - Editing an appointment by clicking the patient name.
 * - Cycling appointment status by clicking the folder icon.
 * - Opening related windows (E-Chart, Billing, Master Record, Rx).
 * - Live updates in response to messages from the popup windows.
 *
 * Backend endpoints used (base: http://localhost:3002)
 * - GET  /doctors
 * - GET  /appointments?date=YYYY-MM-DD
 * - PUT  /appointments/:id/status
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './MainMenu.css';
// import AppointmentFormPopup from '../Components/AppointmentFormPopup';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

/**
 * Shape returned from the backend for an appointment.
 * @typedef {Object} Appointment
 * @property {number|string} id
 * @property {string} start_time          - "HH:MM:SS"
 * @property {number} duration_minutes
 * @property {"booked"|"present"|"being_seen"|"finished"|"missed"} status
 * @property {number|string} patient_id
 * @property {string} firstname
 * @property {string} lastname
 * @property {string} provider_name       - e.g. "Dr. Wong"
 * @property {string} [reason]
 */


/* ===== Helpers ===== */


/**
 * Cycle to the next appointment status (booked → present → being_seen → finished → missed → booked).
 * @param {"booked"|"present"|"being_seen"|"finished"|"missed"} current
 * @returns {"booked"|"present"|"being_seen"|"finished"|"missed"}
 */
const getNextStatus = (currentStatus) => {
  const statuses = ['booked', 'present', 'being_seen', 'finished', 'missed'];
  const currentStatusIndex = statuses.indexOf(currentStatus);

  if (currentStatusIndex === 4) return statuses[0];
  else return statuses[currentStatusIndex+1];
}


/**
 * Convert total minutes since midnight to "HH:MM".
 * @param {number} totalMins
 * @returns {string}
 */
const toKey = (totalMins) => {
  const hh = String(Math.floor(totalMins / 60)).padStart(2, '0');
  const mm = String(totalMins % 60).padStart(2, '0');
  return `${hh}:${mm}`;
};



/**
 * MainMenu component for rendering the primary layout and UI elements.
 * @returns {JSX.Element}
 */
function MainMenu() {
  /* ===== Query params ===== */
  const { search } = useLocation();
  const navigate   = useNavigate();
  const params     = new URLSearchParams(search);

  /* 1. Read YYYY-MM-DD from the URL if present (and parse as *local* date to avoid UTC shifts) */
  const dateParam = params.get('date');


  /* ===== Component state ===== */

  
  /* 2. Parse it as a local date** (so you don’t get a UTC shift) */
  /** @type {[Date, Function]} */
  const [currentDate, setCurrentDate] = useState(() => {
    if (dateParam) {
      const [y, m, d] = dateParam.split('-').map(Number);
      return new Date(y, m - 1, d);
    } else {
      return new Date();
    }
  });


  /** @type {[Appointment[], Function]} */
  const [appointments, setAppointments] = useState([]);

  /** Inline calendar visibility (not the popup window) */
  const [showCalendar, setShowCalendar] = useState(false);

  /** Provider names from the backend (index 0 → left column, index 1 → right column) */
  const [doctors, setDoctors] = useState([]);

  /**
   * Compute YYYY-MM-DD for the currently viewed date.
   * @returns {string}
   */
  const currentIsoDate = () => currentDate.toLocaleDateString('en-CA').slice(0, 10);

  /* ===== Effects ===== */
  
  /**
   * Push the date to the URL and refresh appointments whenever `currentDate` changes.
   */
  useEffect(() => {
    const iso = currentIsoDate();
    navigate(`?date=${iso}`, { replace: true });
    setShowCalendar(false);
    fetchAppointments();
  }, [currentDate, navigate]);


  /**
   * Fetch provider names once.
   */
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


  /**
   * Handle messages from child popups to keep the day view in sync.
   * - { type: 'appointment-deleted', apptId, date }
   * - { type: 'appointment-added',  date }
   */
  useEffect(() => {
    const handler = (event) => {
      const msg = event.data;
      if (msg?.type === 'appointment-deleted') {
        const deletedId = String(msg.apptId);
        const viewDateIso = currentIsoDate();

        /* live update if the message applies to the viewed date (or msg has no date) */
        if (!msg.date || msg.date === viewDateIso) {
          setAppointments(prev => prev.filter(a => String(a.id) !== deletedId));
        }

        /* safety net: background refresh */
        fetchAppointments();
      }

      if (msg?.type === 'appointment-added') {
        fetchAppointments();
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [currentDate]);


  /**
   * Fetch appointments for the current date.
   * @returns {Promise<void>}
   */
  const fetchAppointments = async () => {
    const isoDate = currentIsoDate();
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


  /* ===== Handlers ===== */


  /* Go to previous day on timesheet */
  const handlePrevDay = () => {
    setCurrentDate(d => {
      const prev = new Date(d);
      prev.setDate(prev.getDate() - 1);
      return prev;
    });
  };


  /* Go to next day on timesheet */
  const handleNextDay = () => {
    setCurrentDate(d => {
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      return next;
    });
  };


  /* Go to current date on timesheet */
  const handleToday = () => setCurrentDate(new Date()); 


  // /* Toggle inline calendar (not the popup calendar window) */
  // const handleCalendarToggle = () => {
  //   setShowCalendar(open => !open);
  // };


  /* Open standalone calendar popup window */
  const handleCalendarOpen = () => {
    window.open('/calendar-popup', 'Calendar', 'width=320,height=360,resizable,scrollbars');
  };


  /**
   * Open the Add Appointment popup prefilled with the clicked time & provider.
   * @param {string} time      - "HH:MM"
   * @param {1|2} providerId   - column index for the provider
   */
  const handleTimeClick = (time, providerId) => {
    const isoDate = currentIsoDate();
    const popupURL = `/appointment-form-popup?time=${encodeURIComponent(time)}&providerId=${providerId}&mode=add&date=${isoDate}`;
    window.open(popupURL, 'ADD APPOINTMENT', 'width=600,height=550');
  };


   /**
   * Update appointment status (cycles through the allowed states).
   * Status updated upon folder icon being clicked
   * @param {number|string} apptId
   * @param {"booked"|"present"|"being_seen"|"finished"|"missed"} currentStatus
   * @returns {Promise<void>}
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
   * Open E-Chart popup for a given row (patient name).
   * @param {Appointment} appt
   */
  const handleEchartClick = async(appt) => {
    const patientId = appt.patient_id;
    const popupURL = `/casemgmt?patientId=${encodeURIComponent(patientId)}`
    window.open(popupURL, 'ENCOUNTER - LASTNAME, FIRSTNAME SEX AGE years', 'width=600,height=550');
  }


  /**
   * Open Billing popup for a given row (patient name).
   * @param {Appointment} appt
   */
  const handleBillingClick = async(appt) => {
    const patientId = appt.patient_id;
    const popupURL = `/billing?patientId=${encodeURIComponent(patientId)}`
    window.open(popupURL, 'Ontario Billing', 'width=600,height=550');
  }


  /**
   * Open Master Record popup for a given row (patient name).
   * @param {Appointment} appt
   */
  const handleMasterRecordClick = async(appt) => {
    const patientId = appt.patient_id;
    const popupURL = `/demographic?patientId=${encodeURIComponent(patientId)}`;
    window.open(popupURL, '_blank', 'width=950,height=800,resizable=yes,scrollbars=yes');
  }


  /**
   * Open Rx popup for a given row (patient name).
   * @param {Appointment} appt
   */
  const handleRxClick = async(appt) => {
    const patientId = appt.patient_id;
    const popupURL = `/Rx?patientId=${encodeURIComponent(patientId)}`;
    window.open(popupURL, 'PATIENT DRUG PROFILE', 'width=600,height=550');
  }


  /**
   * Open Edit Appointment popup for a given row (patient name).
   * @param {string} time
   * @param {1|2} providerId
   * @param {Appointment} appt
   */
  const handleEditAppointment = async (time, providerId, appt) => {
    const isoDate = currentIsoDate();
    const popupURL = `/appointment-form-popup?time=${encodeURIComponent(time)}&providerId=${providerId}&mode=edit&apptId=${appt.id}&date=${isoDate}`;
    window.open(popupURL, 'EDIT APPOINTMENT', 'width=600,height=550');
  }



  /**
   * Render the day’s rows (07:00 → 23:55 in 5-minute increments) with rowSpan
   * cells for appointments. Uses consistent math for both providers
   * to avoid column shifts when spanning hour boundaries.
   *
   * @returns {JSX.Element[]} array of <tr> elements
   */
  const generateTimeRows = () => {
    /* Holds all the <tr> rows for the schedule table */
    /** @type {JSX.Element[]} */
    const rows = [];

    /* When a rowSpan covers future rows, track the time keys to skip rendering new cells. */
    const hiddenProvider1Rows = new Set(); /* keys like "07:30" */
    const hiddenProvider2Rows = new Set();
    
    for (let hour = 7; hour <= 23; hour++) {
      for (let min = 0; min <= 55; min+= 5) {
        const time = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
        
        /* Cells <td> for this specific row */
        /** @type {JSX.Element[]} */
        const rowCells = [];

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
            const spanLength = Math.max(1, Math.ceil(appt.duration_minutes / 5));
            const startTotal = hour * 60 + min;

            for (let i = 1; i < spanLength; i++) {
              const futureKey = toKey(startTotal + i * 5);
              hiddenProvider1Rows.add(futureKey);     // or hiddenProvider2Rows in the other column
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
            const spanLength = Math.max(1, Math.ceil(appt.duration_minutes / 5));
            const startTotal = hour * 60 + min;

            for (let i = 1; i < spanLength; i++) {
              const futureKey = toKey(startTotal + i * 5);
              hiddenProvider2Rows.add(futureKey);     // or hiddenProvider2Rows in the other column
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


  /* === Render === */


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
