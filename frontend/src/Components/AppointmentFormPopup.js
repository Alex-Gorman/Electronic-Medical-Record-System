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

    /* Stores the current search term entered by the user in the input field */
    const [searchKeyword, setSearchKeyword] = useState('');

    /* Store the current date, HARDCODE FOR NOW */
    const currentDate = '2025-06-27'; /* REPLACE WITH DYANMIC DATE LATER */

    /* Store the view mode */
    const [viewMode, setViewMode] = useState("form"); /* "form" or "search" */

    /* Store the selected patient */
    const [selectedPatient, setSelectedPatient] = useState(null);

    const [nameInput, setNameInput] = useState("");

    const [duration, setDuration] = useState(15);  /* default 15 mins */
    const [appointmentReason, setAppointmentReason] = useState('');

    useEffect(() => {
        document.title = 'ADD APPOINTMENT';
        if (mode === 'add') document.title = 'ADD APPOINTMENT';
        else if (mode === 'edit') document.title = 'EDIT APPOINTMENT';
    }, []);

    // Cancel button handler
    const handleCancel = () => {
        window.close();
    };

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
        if (e.key == "Enter") {
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

    /* */
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

        /* Get the raw minutes since midnight, will make it easier to compare times */
        const selectedTimeRawMinutes = (parseInt(time.split(':')[0]) * 60) + parseInt(time.split(':')[1]);

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

        const appointmentData = {
            patientId: selectedPatient.id,
            // providerId: selectedProviderId,
            providerId: providerId,
            date: '2025-06-27',   // Use the prop passed from MainMenu
            time: time,
            duration: duration || 15, // Default to 15 if not selected
            reason: appointmentReason || 'General Consult',
            status: 'booked'
        };

        alert("got here 1");

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
        }
        /* Notify the parent window of successful appointment addition */
        if (window.opener) {
        window.opener.postMessage('appointment-added', '*');
        }

        /* Close the popup window */
        window.close();

        } catch (error) {
      console.error('Booking failed', error);
      alert('Error booking appointment');
        };  
    }; 

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
                    <input type="time" defaultValue={time} />

                    <label>Duration (min):</label>
                    <input
                        type="number"
                        value={duration}
                        onChange={(e) => setDuration(Number(e.target.value))}
                    />

                    <label>Name:</label>
                    <input
                    type="text"
                    value={selectedPatient ? `${selectedPatient.lastname}, ${selectedPatient.firstname}` : nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
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
                    <select defaultValue="To Do">
                    <option>To Do</option>
                    <option>Here</option>
                    <option>In Room</option>
                    <option>No Show</option>
                    <option>Billed</option>
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
                <button onClick={handleBookAppointmentPopup}>Add Appointment</button>
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
