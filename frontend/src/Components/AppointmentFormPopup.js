/**
 * AppointmentFormPopup.js
 *
 * Popup UI for creating or editing an appointment.
 *
 * Reads URL query params:
 *  - time       (string "HH:MM")
 *  - providerId (string | number)
 *  - apptId     (string | number, only in edit mode)
 *  - mode       ("add" | "edit")
 *  - date       (string "YYYY-MM-DD")
 *
 * Backend endpoints used (base: http://localhost:3002):
 *  - GET    /appointments?date=YYYY-MM-DD&providerId=ID
 *  - GET    /appointments/:id
 *  - POST   /appointments
 *  - PUT    /appointments/:id
 *  - DELETE /appointments/:id
 *  - GET    /patients/search?keyword=...&mode=search_name
 *
 * @file
 * @module AppointmentFormPopup
 * @component AppointmentFormPopup
 * @example
 * // Add
 * window.open(
 *   '/appointment-form-popup?mode=add&providerId=1&date=2025-08-04&time=10:00',
 *   'ADD APPOINTMENT',
 *   'width=600,height=550'
 * );
 *
 * @example
 * // Edit
 * window.open(
 *   '/appointment-form-popup?mode=edit&providerId=1&apptId=42&date=2025-08-04&time=10:25',
 *   'EDIT APPOINTMENT',
 *   'width=600,height=550'
 * );
 */

import { useLocation } from 'react-router-dom';
import React, {useEffect, useState} from 'react';
import './AppointmentFormPopup.css';

/**
 * @typedef {Object} Patient
 * @property {number} id
 * @property {string} firstname
 * @property {string} lastname
 */

/**
 * Shape returned by the appointments API.
 * @typedef {Object} Appointment
 * @property {number} id
 * @property {string} start_time             // "HH:MM:SS"
 * @property {number} duration_minutes
 * @property {string} [reason]
 * @property {'booked'|'present'|'being_seen'|'finished'|'missed'} status
 * @property {number} patient_id
 * @property {string} firstname
 * @property {string} lastname
 * @property {string} [provider_name]
 */

/**
 * AppointmentFormPopup
 *
 * Renders the popup form. In edit mode it loads the appointment once; on save it
 * either POSTs (add) or PUTs (edit). It also performs client-side conflict
 * detection by fetching same-day appointments for the provider.
 *
 * @returns {JSX.Element}
 * @emits window#message { type: 'appointment-added', apptId: string|number, date: string }
 * @emits window#message { type: 'appointment-deleted', apptId: string|number, date: string }
 */
function AppointmentFormPopup() {
    /* ===== Query params ===== */
    const location = useLocation();
    const params = new URLSearchParams(location.search);

    /* mode is either 'add' or 'edit' */
    const mode = params.get("mode");
    const time = params.get("time");
    const providerId = params.get("providerId");
    const apptId = params.get("apptId");
    const dateParam   = params.get("date");
    const isEditMode = mode === 'edit';

    /* ===== Component state ===== */
    /** @type {["form"|"search", Function]} */
    const [viewMode, setViewMode] = useState("form");

    /** @type {[Patient|null, Function]} */
    const [selectedPatient, setSelectedPatient] = useState(null);

    /** @type {[Appointment['status'], Function]} -> Appointment Status */
    const [appointmentStatus, setAppointmentStatus] = useState('booked');

    /** @type {[string, Function]} -> Appointment Start Time */
    const [startTime, setStartTime] = useState(time || '');

    /** @type {[string, Function]} -> Appointment Duration Time */
    const [durationString, setDurationString] = useState('15');

    /** @type {[string, Function]} */
    const [appointmentReason, setAppointmentReason] = useState('');

    /** @type {[any[], Function]} */
    const [searchResults, setSearchResults] = useState([]);

    /** @type {[string, Function]} */
    const [nameInput, setNameInput] = useState("");


    /**
     * Parse the date param; fallback to today.
     * NOTE: Using toISOString() can shift the calendar day if the Date carries a non-midnight local time.
     * Here, dateParam comes as YYYY-MM-DD (no time), so new Date(dateParam) is fine in modern browsers.
     */
    const currentDate = dateParam ? new Date(dateParam) : new Date();
    const isoDate = currentDate.toISOString().slice(0, 10);

    /* UI <-> backend status label mapping */
    const uiToBackendStatus = {
        'To Do': 'booked',
        'Here': 'present',
        'In Room': 'being_seen',
        'No Show': 'missed',
        'Billed': 'finished',
    };

    const backendToUILabel = {
        booked: 'To Do',
        present: 'Here',
        being_seen: 'In Room',
        missed: 'No Show',
        finished: 'Billed',
    };

    /* ===== Effects ===== */

    useEffect(() => {
        /* In edit mode, load the existing appointment data once */
        if (!isEditMode || !apptId) return;

        console.log('Loading appointment id=', apptId);
        fetch(`http://localhost:3002/appointments/${apptId}`)
            .then(res => {
            if (!res.ok) throw new Error(`Status ${res.status}`);
            return res.json();
            })
            .then(appt => {
            setDurationString(String(appt.duration_minutes));
            setAppointmentReason(appt.reason || '');
            setAppointmentStatus(appt.status);
            setSelectedPatient({
                id: appt.patient_id,
                firstname: appt.firstname,
                lastname: appt.lastname,
            });
            setStartTime(appt.start_time.slice(0,5));
            })
            .catch(err => {
            console.error('Failed to load appointment for edit:', err);
            alert('Could not load appointment');
            });
    }, [isEditMode, apptId]);
    
    useEffect(() => {
        /* Set window title to reflect mode */
        document.title = 'ADD APPOINTMENT';
        if (mode === 'add') document.title = 'ADD APPOINTMENT';
        else if (mode === 'edit') document.title = 'EDIT APPOINTMENT';
    }, []);

    /* ===== Helpers ===== */

    /**
     * Round a “HH:MM” time string to the nearest 5-minute mark.
     * E.g. “10:27” → “10:25”, “10:28” → “10:30”.
     * 
     * @param {string} timeStr 
     * @returns {string} rounded time “HH:MM”
     */    
    function roundToNearestFive(timeStr) {
        if (!timeStr) return timeStr;
        const [h, m] = timeStr.split(':').map(Number);
        const totalMinutes = h * 60 + m;
        const rounded = Math.round(totalMinutes / 5) * 5;
        const wrapped = (rounded + 24 * 60) % (24 * 60); // keep within day
        const rh = Math.floor(wrapped / 60);
        const rm = wrapped % 60;
        return `${String(rh).padStart(2, '0')}:${String(rm).padStart(2, '0')}`;
    }


    /**
     * Determine whether booking (selectedTimeRawMinutes .. +durationNum) overlaps with an existing appointment.
     * Uses half-open interval logic: [start, end)
     * Conflict if (newAppointmentStart >= currentBookedAppointmentStart) && (newAppointmentStart <= currentBookedAppointmentEnd)
     * Conflict if (newAppointmentEnd >= currentBookedAppointmentStart) && (newAppointmentEnd <= currentBookedAppointmentEnd)
     * Conflict if (newAppointmentStart < currentBookedAppointmentStart) && (newAppointmentEnd > currentBookedAppointmentEnd)
     * Conflict if (newAppointmentStart > currentBookedAppointmentStart) && (newAppointmentEnd < currentBookedAppointmentEnd)
     * 
     * @param {Appointment} appt existing appointment to compare
     * @param {number} durationNum requested duration in minutes
     * @param {number} selectedTimeRawMinutes requested start in minutes since midnight
     * @returns {boolean} true if there is a conflict
     */

    const checkIfTimeConflict = (appt, durationNum, selectedTimeRawMinutes) => {
        /* Appointment start for current appt being checked */
        const currentBookedAppointmentStart = (parseInt(appt.start_time.slice(0, 2)) * 60) + parseInt(appt.start_time.slice(3, 5));

        /* Appointment end for current appt being checked */
        const currentBookedAppointmentEnd = currentBookedAppointmentStart + appt.duration_minutes;

        /* Appointment start for appointment trying to be booked */
        const newAppointmentStart = selectedTimeRawMinutes;
        
        /* Appointment end for appointment trying to be booked */
        const newAppointmentEnd = newAppointmentStart + durationNum;

        let isConflict = false;

        /* If there is a conflict with the new appointment, then set the flag to true */
        if (newAppointmentEnd <= currentBookedAppointmentStart) isConflict = false;
        else if (newAppointmentStart >= currentBookedAppointmentEnd) isConflict = false;
        else if ((newAppointmentStart >= currentBookedAppointmentStart) && (newAppointmentStart <= currentBookedAppointmentEnd)) isConflict = true;
        else if ((newAppointmentEnd >= currentBookedAppointmentStart) && (newAppointmentEnd <= currentBookedAppointmentEnd)) isConflict = true;
        else if ((newAppointmentStart < currentBookedAppointmentStart) && (newAppointmentEnd > currentBookedAppointmentEnd)) isConflict = true;
        else if ((newAppointmentStart > currentBookedAppointmentStart) && (newAppointmentEnd < currentBookedAppointmentEnd)) isConflict = true;
        return isConflict;
    }


    /* ===== Early param validation ===== */
    if (!time || !providerId) {
        return <div>Error: Missing time or provider ID.</div>;
    }


    /* ===== Handlers ===== */

    /* Close the popup without saving */
    const handleCancel = () => {
        window.close();
    };
    
    /**
     * Name box handler: on Enter, perform patient search.
     * @param {React.KeyboardEvent<HTMLInputElement>} e 
     */
    const handleSearch = async (e) => {
        if (e.key === "Enter") {
            e.preventDefault();

            try {
                const res = await fetch(`http://localhost:3002/patients/search?keyword=${encodeURIComponent(nameInput)}&mode=search_name`);
                const data = await res.json();

                if (!res.ok) {
                    alert(data.error || 'Search failed');
                    return;
                    }
                
                setSearchResults(data);
                setViewMode("search");

            } catch (err) {
                console.error(err);
                alert('Failed to fetch results');
            }
        }
    };


    /**
     * Handle booking the appointment for a given patient with their details
     * Main booking flow: validates inputs, checks conflicts, then POST/PUT.
     * Alerts on conflict or network errors. On success, notifies opener and closes.
     */
    const handleBookAppointmentPopup = async () => {
        /* 1. Validate minimal inputs */
        if (!selectedPatient || !time) {
            alert('Please select a patient and a time.');
            return;
        }

        /* 2. Fetch same-day appointments for the provider for conflict checking */
        let freshAppointments = [];
        try {
            const res = await fetch(`http://localhost:3002/appointments?date=${encodeURIComponent(isoDate)}&providerId=${encodeURIComponent(providerId)}`);
            const data = await res.json();
            freshAppointments = Array.isArray(data) ? data : [];
        } catch (error) {
            console.error('Error fetching appointments for conflict check:', error);
            alert('Unable to verify appointment conflicts');
            return;
        }

        /* 3. Normalize time & duration, enforce rounding the chosen time to the nearest five minute mark */
        const roundedStartTime = roundToNearestFive(startTime);
        if (roundedStartTime !== startTime) setStartTime(roundedStartTime);
        const selectedTimeRawMinutes = parseInt(roundedStartTime.split(':')[0], 10) * 60
        + parseInt(roundedStartTime.split(':')[1], 10);

        /* Set the default flag for checking conflicts to false */
        let isConflict = false;

        /* Get the duration time in number format */
        const durationNum = durationString === '' ? 15 : parseInt(durationString, 10);

        /* 4. Conflict detection (skip self when editing) */
        for (const appt of freshAppointments) {
            /* When editing, skip the appointment being edited itself */
            if (isEditMode && String(appt.id) === String(apptId)) continue;

            if (checkIfTimeConflict(appt, durationNum, selectedTimeRawMinutes)) {
                isConflict = true;
                break;
            }
        }

        if (isConflict) {
            alert('This time slot is already booked for the selected provider');
            return;
        }

        /* 5. Persist to backend */
        const appointmentData = {
            patientId: selectedPatient.id,
            providerId: providerId,
            date: isoDate,
            time: roundedStartTime,
            duration: durationNum || 15, /* Default to 15 if not selected */
            reason: appointmentReason,
            status: appointmentStatus
        };

        try {
            let response;
            if (isEditMode && apptId) {
                response = await fetch(`http://localhost:3002/appointments/${apptId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: apptId, ...appointmentData }),
                });
            } else {
                response = await fetch('http://localhost:3002/appointments', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(appointmentData),
                });
            }

            const result = await response.json();
            if (!response.ok) {
                console.error(result.error);
                alert(isEditMode ? 'Failed to save changes' : 'Failed to book appointment');
                return;
            }

            alert(isEditMode ? 'Appointment updated' : 'Appointment booked');
            if (window.opener) {
                window.opener.postMessage({
                type: 'appointment-added',
                apptId, /* deleted id */
                date: isoDate /* "YYYY-MM-DD" */
                }, '*');
            }
            window.close();
        } catch (err) {
            console.error('Save failed', err);
            alert('Error saving appointment');
        }
    }; 


    /**
     * Delete the current appointment (edit mode). Notifies opener and closes.
     */
    const handleDeleteAppointment = async() => {
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

            /* Notify the parent window of sucessful deletion */
            if (window.opener) {
                window.opener.postMessage({
                type: 'appointment-deleted',
                apptId, /* deleted id */
                date: isoDate /* "YYYY-MM-DD" */
                }, '*');
            }

            /* Close the popup window */
            window.close();

        } catch (error) {
            console.error('Error deleting appointment:', error);
            alert('Error deleting appointment');
        }
    }


    /* === Render === */
    return (
        <div className="appointment-form-popup">
        <div className="appointment-form-popup__container">
            {viewMode === "form" ? (
            <>
                <h2>{mode === 'edit' ? 'EDIT AN APPOINTMENT' : 'MAKE AN APPOINTMENT'}</h2>
                <div className="appointment-form form-grid">
                {/* Left Column */}
                <div className="form-left">
                    <label htmlFor="appt-date">Date:</label>
                    <input 
                        id="appt-date"
                        type="date"
                        value={isoDate}
                        disabled
                    />

                    <label htmlFor="appt-start-time">Start Time:</label>
                    <input
                    id="appt-start-time"
                    type="time"
                    step="300"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    />

                    <label htmlFor="appt-duration">Duration (min):</label>
                    <input
                        id="appt-duration"
                        type="number"
                        min={5}
                        step={5}
                        value={durationString}
                        
                        onChange={(e) => {
                            /* allow empty; otherwise strip leading zeros like "025" -> "25" */
                            let v = e.target.value;
                            if (v !== '') {
                            /* remove leading zeros but keep a single zero if user types "0" */
                            v = v.replace(/^0+(?=\d)/, '');
                            /*  optional: constrain to positive integers */
                            if (!/^\d*$/.test(v)) return; /* ignore invalid chars */
                            }
                            setDurationString(v);
                        }}
                        placeholder="15"
                    />

                    <label htmlFor="appt-name">Name:</label>
                    <input
                        id="appt-name"
                        type="text"
                        value={selectedPatient ? `${selectedPatient.lastname}, ${selectedPatient.firstname}` : nameInput}
                        onFocus={() => setSelectedPatient(null)} /* <- clear so value switches to nameInput */
                        onChange={(e) => {
                            setNameInput(e.target.value);
                        }}
                        onKeyDown={handleSearch}
                        placeholder="Type last name and press Enter"
                    />


                    <label htmlFor="appt-reason">Reason:</label>
                    <textarea
                    id="appt-reason"
                    value={appointmentReason}
                    onChange={(e) => setAppointmentReason(e.target.value)}
                    />
                </div>

                {/* Right Column */}
                <div className="form-right">
                    <label htmlFor="appt-status">Status:</label>
                    <select
                        id="appt-status"
                        value={backendToUILabel[appointmentStatus] || 'To Do'}
                        onChange={(e) => {
                            const ui = e.target.value;
                            const backend = uiToBackendStatus[ui];
                            if (backend) setAppointmentStatus(backend);
                        }}
                        >
                        <option>To Do</option>
                        <option>Here</option>
                        <option>In Room</option>
                        <option>No Show</option>
                        <option>Finished</option> {/* if you want to support 'finished' */}
                        {/* omit or separately handle 'Billed' since it's not in your enum */}
                    </select>

                    <label>Doctor:</label>
                    <input type="text" value={`Provider ${providerId}`} disabled />

                    <label>Date Time:</label>
                    <input
                    type="date"
                    value={isoDate}
                    disabled
                    />
                </div>
                </div>
                <div className="form-buttons">
                <button onClick={handleBookAppointmentPopup}>
                    {isEditMode ? 'Save Changes' : 'Add Appointment'}
                </button>

                <button onClick={handleCancel}>Cancel</button>
                {isEditMode && (
                    <button onClick={handleDeleteAppointment}>
                    Delete Appointment
                    </button>
                )}

                </div>
            </>
            ) : (
            <>
                <h2 className="form-title">Select Patient</h2>
                <div className="results-container">
                {searchResults.length > 0 ? (
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
                        {searchResults.map((patient) => (
                        <tr
                            key={patient.id}
                            onClick={() => {
                            setSelectedPatient(patient);
                            setViewMode("form");
                            }}
                            style={{ cursor: "pointer" }}
                        >
                            <td>{patient.lastname}, {patient.firstname}</td>
                            <td>{patient.cellphone || patient.homephone || patient.workphone}</td>
                            <td>{patient.dob ? patient.dob.slice(0, 10) : ''}</td>
                            <td>{patient.email}</td>
                            <td>{patient.patient_status}</td>
                        </tr>
                        ))}
                    </tbody>
                    </table>
                ) : (
                    <p>No results found.</p>
                )}
                </div>
                <div className="form-buttons">
                <button onClick={() => setViewMode("form")}>Back</button>
                </div>
            </>
            )}
        </div>
        </div>
    );
}

export default AppointmentFormPopup;

// console.log("");
// console.log(" providerID " + providerId);
// console.log("");
// console.log("NUM OF APPTS: "+freshAppointments.length);
// console.log("num of appointments: "+freshAppointments.length);
// console.log("DURATION: " + durationNum);
// console.log(" ");
// console.log("currentBookedAppointmentStart: " + currentBookedAppointmentStart);
// console.log("currentBookedAppointmentEnd: " + currentBookedAppointmentEnd);
// console.log("newAppointmentStart: " + newAppointmentStart);
// console.log("newAppointmentEnd: " + newAppointmentEnd);
// console.log(" ");
// console.log("isConflict? : "+isConflict);
// console.log("Time conflict scenario 4");
// alert("Time conflict scenario 4");
// console.log("Time conflict scenario 3");
// alert("Time conflict scenario 3");
// console.log("Time conflict scenario 2");
// alert("Time conflict scenario 2");
// console.log("Time conflict scenario 1");
// alert("Time conflict scenario 1");
// console.log("dateParam: " + dateParam);
// console.log("currentDate: " + currentDate);
// console.log("isoDate: " + isoDate);
// console.log("startTime: " + startTime);