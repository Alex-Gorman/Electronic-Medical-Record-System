import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import './MasterRecord.css';

function MasterRecord() {
    const {search} = useLocation();
    const params = new URLSearchParams(search);
    const patientId = params.get('patientId');

    const [patient, setPatient] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        
        /* If no patient ID, give an error */
        if (!patientId) {
            setError('No patient ID was provided');
            return;
        }

        /* try to get the patient information for the given patient ID */
        fetch(`http://localhost:3002/patients/${patientId}`)
            .then(res => {
                if (!res.ok) {
                    throw new Error(`Status ${res.status}`);
                }
                return res.json();
            })
            .then(data => {
                setPatient(data);
            })
            .catch(err => {
                console.error("Error loading patient record: ", err);
                setError('Failed to load: ' + err.message);
            }); 
        }, [patientId]);
    
    /* If error just render the error message to the page */    
    if (error) return <div className="master-record-error">{error}</div>;

    /* If no patient, just render Loading to the page, until patient is fetched */
    if (!patient) return <div className="master-record-loading">Loading</div>;

    /* Get the age of the patient */
    const age = new Date().getFullYear() - new Date(patient.dob).getFullYear();

    /* Exit Master Record button handler */
    const handleExitMasterRecordButton = () => {
        window.close();
    };

    return (
        <div className="master-record container">
            <nav className="master-record sidebar">
                <h3>PATIENT&apos;S DETAIL RECORD</h3>
                <ul>
                <li><a href="#appt-history">Appt. History</a></li>
                <li><a href="#billing">Billing History</a></li>
                <li><a href="#prescriptions">Prescriptions</a></li>
                <li><a href="#e-chart">E-Chart</a></li>
                {/* etc */}
                </ul>
            </nav>

            <div className="master-record main">
                <header className="master-record header">
                    <div className="master-record name">
                        {patient.lastname.toUpperCase()}, {patient.firstname.toUpperCase()} F {age} years
                    </div>
                    <div className="master-record next-appt">
                        Next Appointment: {/* HARD CODED FOR NOW, FETCH LATER */}
                        2025-08-15
                    </div>
                </header>

                <section className="master-record search-bar">
                {/* Replicate search page here */}
                </section>

                <section className="master-record info-grid">
                    <div className="master-record box demographic">
                        <h4>DEMOGRAPHIC</h4>
                        <p><strong>Last Name:</strong> {patient.lastname.toUpperCase()}</p>
                        <p><strong>First Name:</strong> {patient.firstname.toUpperCase()}</p>
                        <p><strong>Preferred Name:</strong> {patient.preferredname || '—'}</p>
                        <p><strong>Sex:</strong> {patient.sex}</p>
                        <p><strong>Age:</strong> {age}</p>
                        <p><strong>DOB:</strong> {patient.dob}</p>
                        <p><strong>Country:</strong>Canada</p>
                        <p><strong>Language:</strong> English</p>
                    </div>

                    <div className="master-record box contact">
                        <h4>CONTACT INFORMATION</h4>
                        <p><strong>Home Phone:</strong> {patient.homephone}</p>
                        <p><strong>Cell Phone:</strong> {patient.cellphone}</p>
                        <p><strong>Work Phone:</strong> {patient.workphone}</p>
                        <p><strong>Address:</strong> {patient.address}, {patient.city}, {patient.province} {patient.postalcode}</p>
                        <p><strong>Email:</strong> {patient.email}</p>
                    </div>

                    <div className="master-record box insurance">
                        <h4>HEALTH INSURANCE</h4>
                        <p><strong>Health Ins. #:</strong> {patient.healthNumber}</p>
                        <p><strong>Version Code:</strong> {patient.healthVersion}</p>
                    </div>

                    <div className="master-record box clinic-status">
                        <h4>PATIENT CLINIC STATUS</h4>
                        <p><strong>Family MD:</strong> {patient.familyPhysician}</p>
                        <p><strong>Patient Status:</strong> {patient.status}</p>
                    </div>
                </section>

                <footer className="master-record footer">
                    <button onClick={handleExitMasterRecordButton}>Exit Master Record</button>
                    {/* Will add PDF Label functionality later */}
                    {/* <button>PDF Label</button> */}
                    <button>Edit</button>

                </footer>
            </div>
        </div>
    );

}

export default MasterRecord;




