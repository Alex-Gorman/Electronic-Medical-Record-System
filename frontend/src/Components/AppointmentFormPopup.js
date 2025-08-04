import { useLocation } from 'react-router-dom';
import React, {useEffect, useState} from 'react';
import './AppointmentFormPopup.css';

function AppointmentFormPopup() {
    const location = useLocation();
    const params = new URLSearchParams(location.search);

    const time = params.get("time");
    const providerId = params.get("providerId");
    const apptId = params.get("apptId");

    const mode = params.get("mode"); /* mode is either 'add' or 'edit' */
    const isEditMode = mode === 'edit';
    
    /* Holds the array of patient search results from backend */
    const [searchResults, setSearchResults] = useState([]);

    /* Store the current date, HARDCODE FOR NOW */
    const currentDate = '2025-06-27'; /* REPLACE WITH DYANMIC DATE LATER */

    /* Store the view mode */
    const [viewMode, setViewMode] = useState("form"); /* "form" or "search" */

    /* Store the selected patient */
    const [selectedPatient, setSelectedPatient] = useState(null);

    /* Appointment status */
    const [appointmentStatus, setAppointmentStatus] = useState('booked');

    /* Appointment start time */
    const [startTime, setStartTime] = useState(time || '');

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

    const [nameInput, setNameInput] = useState("");

    const [durationString, setDurationString] = useState('15');

    const [appointmentReason, setAppointmentReason] = useState('');

    useEffect(() => {
        /* If in edit mode and there is a valid appointment id */
        if (isEditMode && apptId) {
            fetch(`http://localhost:3002/appointments?date=${currentDate}`)
            .then(res => res.json())
            .then(all => {
                /* Find the specific appt */
                /* === MAY WANT BACKEND GET /appointments/:id function in future === */
                const appt = all.find((a) => String(a.id) === String(apptId));
                if (!appt) {
                    alert('Appointment not found for editing');
                    return;
                }
                setDurationString(String(appt.duration_minutes));
                setAppointmentReason(appt.reason || '');
                setAppointmentStatus(appt.status);
                setSelectedPatient({
                id: appt.patient_id,
                firstname: appt.firstname,
                lastname: appt.lastname,
                });
                setStartTime(appt.start_time.slice(0,5)); /* e.g. "14:30" */
            })
            .catch(err => {
                console.error('Failed to load appointment for edit:', err);
                alert('Could not load appointment');
            });
        }
    }, [isEditMode, apptId, currentDate]);

    /* Helper function to round "HH:MM" to nearest 5 minutes */
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

    /* Title for the window based on whether there is an appointment being added or edited */
    useEffect(() => {
        document.title = 'ADD APPOINTMENT';
        if (mode === 'add') document.title = 'ADD APPOINTMENT';
        else if (mode === 'edit') document.title = 'EDIT APPOINTMENT';
    }, []);

    /* Cancel button handler */
    const handleCancel = () => {
        window.close();
    };

    /* If no time or providerId, give error message on page */
    if (!time || !providerId) {
        return <div>Error: Missing time or provider ID.</div>;
    }

    /* Get the EST time zone (Toronto Time) */
    const getESTDateTimeLocal = () => {
        /* Create a date in local timezone (EST if system is EST) */
        const now = new Date();

        /* Convert explicitly to New York timezone components */
        const estFormatter = new Intl.DateTimeFormat('en-US', {
            timeZone: 'America/New_York',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        });

        const parts = estFormatter.formatToParts(now);
        const values = {};
        parts.forEach(p => { values[p.type] = p.value; });

        /* Format as YYYY-MM-DDTHH:MM */
        return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
    };

    /* Search handler function (when pressing Enter in name input */
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

    /* Format phone */
    const formatPhone = (number) => {
        if (!number) return '';
        const cleaned = number.replace(/\D/g, '');
        if (cleaned.length !== 10) return number;
        return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    };

    /**
     * Handle booking the appointment for a given patient with their details
     * Handle errors if there is a conflict or not all of the correct info is given
     */
    const handleBookAppointmentPopup = async () => {
        /* Ensure we have all required data */
        if (!selectedPatient || !time) {
            alert('Please select a patient and a time.');
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

        /*  enforce rounding the chosen time to the nearest five minute mark */
        const roundedStartTime = roundToNearestFive(startTime);
        if (roundedStartTime !== startTime) {
        setStartTime(roundedStartTime);
        }
        const selectedTimeRawMinutes = parseInt(roundedStartTime.split(':')[0], 10) * 60
        + parseInt(roundedStartTime.split(':')[1], 10);

        /* Set the default flag for checking conflicts to false */
        let isConflict = false;

        /* Get the duration time in number format */
        const durationNum = durationString === '' ? 15 : parseInt(durationString, 10);


        for (const appt of freshAppointments) {
            /* When editing, skip the appointment being edited itself */
            if (isEditMode && String(appt.id) === String(apptId)) continue;

            /* Appointment start for current appt being checked */
            const apptStart = (parseInt(appt.start_time.slice(0, 2)) * 60) + parseInt(appt.start_time.slice(3, 5));

            /* Appointment end for current appt being checked */
            const apptEnd = apptStart + appt.duration_minutes;

            /* Appointment start for appointment trying to be booked */
            const selectedStart = selectedTimeRawMinutes;

            /* Appointment end for appointment trying to be booked */
            const selectedEnd = selectedStart + durationNum;

            /* If there is a conflict with the new appointment, then set the flag to true */
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

        const appointmentData = {
            patientId: selectedPatient.id,
            providerId: providerId,
            date: '2025-06-27',
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
            if (window.opener) window.opener.postMessage('appointment-added', '*');
            window.close();
        } catch (err) {
            console.error('Save failed', err);
            alert('Error saving appointment');
        }
    }; 

    /**
     * Deletes the chosen appointment from the database, and sends message to main menu to update UI
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
            window.opener.postMessage('appointment-deleted', '*');
            }

            /* Close the popup window */
            window.close();

        } catch (error) {
            console.error('Error deleting appointment:', error);
            alert('Error deleting appointment');
        }
    }

    return (
        <div className="appointment-form-popup">
        <div className="appointment-form-popup__container">
            {viewMode === "form" ? (
            <>
                <h2>{mode === 'edit' ? 'EDIT AN APPOINTMENT' : 'MAKE AN APPOINTMENT'}</h2>
                <div className="appointment-form form-grid">
                {/* Left Column */}
                <div className="form-left">
                    <label>Date:</label>
                    <input type="date" defaultValue={new Date().toISOString().slice(0, 10)} />

                    <label>Start Time:</label>
                    <input
                    type="time"
                    step="300"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    />

                    <label>Duration (min):</label>
                    <input
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

                    <label>Name:</label>
                    <input
                        type="text"
                        value={selectedPatient ? `${selectedPatient.lastname}, ${selectedPatient.firstname}` : nameInput}
                        onFocus={() => setSelectedPatient(null)} /* <- clear so value switches to nameInput */
                        onChange={(e) => {
                            setNameInput(e.target.value);
                        }}
                        onKeyDown={handleSearch}
                        placeholder="Type last name and press Enter"
                    />


                    <label>Reason:</label>
                    <textarea
                    value={appointmentReason}
                    onChange={(e) => setAppointmentReason(e.target.value)}
                    />
                </div>

                {/* Right Column */}
                <div className="form-right">
                    <label>Status:</label>
                    <select
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
                    type="datetime-local"
                    value={new Date().toISOString().slice(0, 16)}
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
                            <td>{formatPhone(patient.cellphone || patient.homephone || patient.workphone)}</td>
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
