/**
 * @file MasterRecord.js
 * @module MasterRecord
 * @description
 * Patient “Master Record” view. Fetches a single patient’s demographics and allows
 * inline editing with client-side validation for key fields (health number, version,
 * email, postal code). Also fetches a list of doctors for the Family MD selector.
 *
 * Backend endpoints used (base: http://localhost:3002):
 * - GET    /patients/:id            → load patient details
 * - PUT    /patients/:id            → save updates
 * - GET    /doctors                 → list of doctor names (for dropdown)
 */

import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import './MasterRecord.css';

/**
 * @typedef {Object} Patient
 * @property {number|string} id
 * @property {string} lastname
 * @property {string} firstname
 * @property {string} [preferredname]
 * @property {string} [sex]
 * @property {string} dob              ISO string `"YYYY-MM-DD"` or `"YYYY-MM-DDTHH:mm:ss.sssZ"`
 * @property {string} [homephone]
 * @property {string} [cellphone]
 * @property {string} [workphone]
 * @property {string} [address]
 * @property {string} [city]
 * @property {string} [province]
 * @property {string} [postalcode]
 * @property {string} [email]
 * @property {string} [healthNumber]   // display alias for healthinsurance_number
 * @property {string} [healthVersion]  // display alias for healthinsurance_version_code
 * @property {string} [status]         // display alias for patient_status
 * @property {string} [familyPhysician]
 */

/**
 * Editable form model (mirrors UI fields).
 * @typedef {Object} PatientForm
 * @property {string} [lastname]
 * @property {string} [firstname]
 * @property {string} [preferredname]
 * @property {string} [sex]
 * @property {string} [dob]                     // "YYYY-MM-DD"
 * @property {string} [homephone]
 * @property {string} [cellphone]
 * @property {string} [workphone]
 * @property {string} [address]
 * @property {string} [city]
 * @property {string} [province]
 * @property {string} [postalcode]
 * @property {string} [email]
 * @property {string} [healthNumber]            // exactly 10 digits
 * @property {string} [healthVersion]           // two uppercase letters
 * @property {string} [status]
 * @property {string} [familyPhysician]
 */

/**
 * MasterRecord component
 *
 * Displays a patient’s details with an edit mode. On save, it performs a PUT to the backend
 * and re-fetches the canonical record to keep the UI in sync with the database.
 *
 * @returns {JSX.Element}
 */
function MasterRecord() {
    /* ===== URL param parsing ===== */
    const {search} = useLocation();
    const params = new URLSearchParams(search);

    /* Patient id to fetch (string from query params). */
    const patientId = params.get('patientId');

    /* ===== Component state ===== */

    /** @type {[Patient|null, Function]} */
    const [patient, setPatient] = useState(null);

    /** @type {[string|null, Function]} */
    const [error, setError] = useState(null);

    /** @type {[boolean, Function]} */
    const [isEditing, setIsEditing] = useState(false);

    /** @type {[PatientForm, Function]} */
    const [form, setForm] = useState({});

    /**
     * List of doctors for the Family MD dropdown.
     * Backend currently returns `string[]` of names.
     * @type {[string[], Function]}
     */
    const [doctors, setDoctors] = useState([]);

    /**
     * Per-field validation errors for the edit form.
     * Keys correspond to `PatientForm` keys.
     * @type {[Record<string,string>, Function]}
     */
    const [fieldErrors, setFieldErrors] = useState({})

    /* ===== Effects ===== */
    
    /**
     * 1. Fetch the patient info.
     * - Requires `patientId` in the query string.
     * - Trims DOB to `YYYY-MM-DD` for friendly display.
     */
    useEffect(() => {
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
                setPatient({ 
                    ...data, 
                    dob: data.dob.slice(0,10)   /* trim the timestamp */
                }); 
            })
            .catch(err => {
                console.error("Error loading patient record: ", err);
                setError('Failed to load: ' + err.message);
            }); 
        }, [patientId]);
    

    /**
     * 2. Fetch the list of Doctors (for family MD select)
     */
    useEffect(() => {
        fetch(`http://localhost:3002/doctors`)
        .then(res => {
            if (!res.ok) {
                throw new Error(`Status ${res.status}`);
            }
            return res.json();
        })
        .then(data => {
            setDoctors(data);
        })
        .catch(err => {
            console.error("Error loading list of doctors: ", err);
            setError('Failed to load: ' + err.message);
        })
    }, []);    


    /**
     * 3. Live-validate form fields when they change:
     * - healthNumber: exactly 10 digits
     * - healthVersion: exactly two uppercase letters
     * - email: basic RFC-style shape
     * - postalcode: Canadian format A1A 1A1 or A1A1A1
     */
    useEffect(() => {
        const errs = {}

        if (form.healthNumber != null) {
            if (!/^\d{10}$/.test(form.healthNumber)) {
                errs.healthNumber = 'Must be exactly 10 digits'
            }
        }
        if (form.healthVersion != null) {
            if (!/^[A-Z]{2}$/.test(form.healthVersion)) {
                errs.healthVersion = 'Must be exactly two uppercase letters'
            }
        }
        if (form.email != null) {
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
                errs.email = 'Invalid email address'
            }
        }
        if (form.postalcode != null) {
            if (!/^[A-Za-z]\d[A-Za-z][ ]?\d[A-Za-z]\d$/.test(form.postalcode)) {
                errs.postalcode = 'Invalid Canadian postal code'
            }
        }
        setFieldErrors(errs)
    }, [form.healthNumber, form.healthVersion, form.email, form.postalcode]);


    /* ===== Early rendering for error/loading ===== */
    

    /* If error just render the error message to the page */    
    if (error) return <div className="master-record-error">{error}</div>;

    /* If no patient, just render Loading to the page, until patient is fetched */
    if (!patient) return <div className="master-record-loading">Loading</div>;


    /* ===== Derived values ===== */


    /* Get the age of the patient */
    const age = new Date().getFullYear() - new Date(patient.dob).getFullYear();


    /* ===== Handlers ===== */
    

    /**
     * Close the Master Record window.
     * @returns {void}
     */
    const handleExitMasterRecordButton = () => {
        window.close();
    };


    /**
     * Controlled input change handler for the edit form.
     * Copies the previous form state and updates the changed field.
     * 
     * @param {React.ChangeEvent<HTMLInputElement|HTMLSelectElement>} event
     * @returns {void}
     */
    function handleChange(event) {
 
        /** @type {HTMLInputElement|HTMLSelectElement} */
        const target = event.target;
        const inputName = target.name;
        const inputValue = target.value;

        /* Update form state by taking previous state object, copying all existing fields, and overwriting the one field that changed */
        setForm(previousForm => {
            /* Shallow copy of the old form */
            const newForm = { ...previousForm };

            /* Update the one field being changed */
            newForm[inputName] = inputValue;

            /* Return the new form to become the new state for the form */
            return newForm;
        });
    }


    /**
     * Cancel editing: revert form back to the last saved patient state.
     * @returns {void}
     */
    const handleCancel = () => {
        /* reset form data back to last saved patient data */
        setForm(patient);
        setIsEditing(false);
    };


    /**
     * Persist demographic edits to the backend.
     * - Validates there are no fieldErrors.
     * - Maps form fields to backend column names.
     * PUTs the update and then re-fetches the patient to refresh local state.
     * 
     * @returns {Promise<void>}
     */
    const handleSave = async () => {

        /* Block the save attempt if there are any errors in the demographic fields */
        if (Object.keys(fieldErrors).length > 0) return

        /* 0. form fields to patients column names */
        const payload = {
            lastname:                       form.lastname,
            firstname:                      form.firstname,
            preferredname:                  form.preferredname,
            address:                        form.address,
            city:                           form.city,
            postalcode:                     form.postalcode,
            province:                       form.province,
            homephone:                      form.homephone,
            workphone:                      form.workphone,
            cellphone:                      form.cellphone,
            email:                          form.email,
            dob:                            form.dob.slice(0,10),
            sex:                            form.sex,
            healthinsurance_number:         form.healthNumber,
            healthinsurance_version_code:   form.healthVersion,
            patient_status:                 form.status,
            family_physician:               form.familyPhysician,
        };
        
        try {
            /* 1. Save the updated patient info */
            fetch(`http://localhost:3002/patients/${patientId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                // body: JSON.stringify(pay),
            })
            .then(res => {
                if (!res.ok) throw new Error(`Status ${res.status}`);
                return res.json();
            })
            .then(() => {
                setPatient(form);
                setIsEditing(false);
            })
            .catch(err => setError('Failed to save: ' + err.message));

            /* 2) Re-fetch the updated patient */
            const getRes = await fetch(`http://localhost:3002/patients/${patientId}`);
            if (!getRes.ok) {
                throw new Error(`GET failed: ${getRes.status}`);
            }
            const latest = await getRes.json();

            /* 3) Update local state from the real DB response */
            setPatient(latest);
            setIsEditing(false);

        } catch (err) {
            console.error('Save failed:', err);
            setError('Failed to save: ' + err.message);
        }

    }

    /* === Render === */

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
                        {isEditing ? (
                            <>
                                <label> Last Name: <input name="lastname" value={form.lastname} onChange={handleChange} /> </label>
                                <label> First Name: <input name="firstname" value={form.firstname} onChange={handleChange} /> </label>
                                <label> Prefferred Name: <input name="preferredname" value={form.preferredname || ''} onChange={handleChange} /> </label>
                                <label> Sex:
                                    <select name="sex" value={form.sex} onChange={handleChange} >
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                        <option value="">Other/Unknown</option>
                                    </select>
                                </label>
                                <label> DOB: <input name="dob" type="date" value={form.dob} onChange={handleChange} /> </label>
                            </>
                        ) : (
                            <>
                                <p><strong>Last Name:</strong> {patient.lastname.toUpperCase()}</p>
                                <p><strong>First Name:</strong> {patient.firstname.toUpperCase()}</p>
                                <p><strong>Preferred Name:</strong> {patient.preferredname || '—'}</p>
                                <p><strong>Sex:</strong> {patient.sex}</p>
                                <p><strong>Age:</strong> {age}</p>
                                <p><strong>DOB:</strong> {patient.dob}</p>
                                <p><strong>Country:</strong> Canada</p>
                                <p><strong>Language:</strong> English</p>
                            </>
                        )}
                    </div>

                    <div className="master-record box contact">
                        <h4>CONTACT INFORMATION</h4>
                        {isEditing ? (
                            <>
                                <label>Home Phone: <input name="homephone" value={form.homephone} onChange={handleChange} /> </label>
                                <label>Cell Phone: <input name="cellphone" value={form.cellphone} onChange={handleChange} /> </label>
                                <label>Work Phone: <input name="workphone" value={form.workphone} onChange={handleChange} /> </label>
                                <label>Address: <input name="address" value={form.address} onChange={handleChange} /> </label>
                                <label>City: <input name="city" value={form.city} onChange={handleChange} /> </label>
                                {/* <label>Province: <input name="province" value={form.province} onChange={handleChange} /> </label> */}
                                <label>Province:
                                    <select name="province" value={form.province} onChange={handleChange}>
                                        <option value="">— Select province —</option>
                                        <option value="Alberta">Alberta</option>
                                        <option value="British Columbia">British Columbia</option>
                                        <option value="Manitoba">Manitoba</option>
                                        <option value="New Brunswick">New Brunswick</option>
                                        <option value="Newfoundland and Labrador">Newfoundland and Labrador</option>
                                        <option value="Northwest Territories">Northwest Territories</option>
                                        <option value="Nova Scotia">Nova Scotia</option>
                                        <option value="Nunavut">Nunavut</option>
                                        <option value="Ontario">Ontario</option>
                                        <option value="Prince Edward Island">Prince Edward Island</option>
                                        <option value="Quebec">Quebec</option>
                                        <option value="Saskatchewan">Saskatchewan</option>
                                        <option value="Yukon">Yukon</option>
                                    </select>
                                </label>
                                {/* <label>Postal Code: <input name="postalcode" value={form.postalcode} onChange={handleChange} /> </label> */}
                                <label>
                                    Postal Code:
                                    <input  
                                        name="postalcode"  
                                        value={form.postalcode || ''}
                                        onChange={handleChange}
                                    />
                                    </label>
                                    {fieldErrors.postalcode && (
                                        <div className="field-error">{fieldErrors.postalcode}</div>
                                )}
                                {/* <label>Email: <input name="email" value={form.email} onChange={handleChange} /> </label> */}
                                <label>
                                    Email:
                                    <input
                                        name="email"
                                        type="email"
                                        value={form.email || ''}
                                        onChange={handleChange}
                                    />
                                </label>
                                {fieldErrors.email && (
                                    <div className="field-error">{fieldErrors.email}</div>
                                )}
                            </>
                        ) : (
                            <>
                                <p><strong>Home Phone:</strong> {patient.homephone}</p>
                                <p><strong>Cell Phone:</strong> {patient.cellphone}</p>
                                <p><strong>Work Phone:</strong> {patient.workphone}</p>
                                <p><strong>Address:</strong> {patient.address}</p>
                                <p><strong>City:</strong> {patient.city}</p>
                                <p><strong>Province:</strong> {patient.province}</p>
                                <p><strong>Postal Code:</strong> {patient.postalcode}</p>
                                <p><strong>Email:</strong> {patient.email}</p>
                            </>
                        )}
                        
                    </div>

                    <div className="master-record box insurance">
                        <h4>HEALTH INSURANCE</h4>
                        {isEditing ? (
                            <>
                                {/* <label>Health Ins. #: <input name="healthNumber" value={form.healthNumber} onChange={handleChange} /> </label> */}

                                <label>
                                    Health Ins. #:
                                    <input
                                    name="healthNumber"
                                    value={form.healthNumber || ''}
                                    onChange={handleChange}
                                    inputMode="numeric"
                                    maxLength={10}
                                    />
                                </label>
                                {fieldErrors.healthNumber && (
                                    <div className="field-error">{fieldErrors.healthNumber}</div>
                                )}

                                {/* <label>Version Code: <input name="healthVersion" value={form.healthVersion} onChange={handleChange} /> </label> */}

                                <label>
                                    Version Code:
                                    <input
                                        name="healthVersion"
                                        value={form.healthVersion || ''}
                                        onChange={e => {
                                        /* Always uppercase and trim to 2 chars */
                                        let v = e.target.value.toUpperCase().slice(0, 2);
                                        setForm(f => ({ ...f, healthVersion: v }));
                                        }}
                                        style={{ textTransform: 'uppercase' }}
                                        maxLength={2}              /* disallow more than 2 chars */
                                        pattern="[A-Z]{2}"         /* HTML5 pattern hint */
                                        title="Enter exactly 2 uppercase letters"
                                    />
                                    </label>
                                    {fieldErrors.healthVersion && (
                                    <div className="field-error">
                                        {fieldErrors.healthVersion /* e.g. "Must be exactly two uppercase letters" */}
                                    </div>
                                    )}

                            </>
                        ) : (
                            <>
                                <p><strong>Health Ins. #:</strong> {patient.healthNumber}</p>
                                <p><strong>Version Code:</strong> {patient.healthVersion}</p>
                            </>
                        )}
                    </div>

                    <div className="master-record box clinic-status">
                        <h4>PATIENT CLINIC STATUS</h4>
                        {isEditing ? (
                            <>
                                {/* <label>Family MD: <input name="familyPhysician" value={form.familyPhysician} onChange={handleChange} /> </label> */}
                                {/* Family MD dropdown */}
                                <label> Family MD: 
                                    <select name="familyPhysician" value={form.familyPhysician} onChange={handleChange}>
                                        <option value="">— Select doctor —</option>
                                        {doctors.map(name => (
                                        <option key={name} value={name}> {name} </option> ))}
                                    </select>
                                </label>
                                <label> Patient Status: 
                                        <select name="status" value={form.status} onChange={handleChange}>
                                            <option value="active">Active</option>
                                            <option value="not enrolled">Not Enrolled</option>
                                        </select>
                                </label>
                            </>
                        ) : (
                            <>
                                <p><strong>Family MD: </strong> {patient.familyPhysician}</p>
                                <p><strong>Patient Status: </strong> {patient.status}</p>
                            </>
                        )}
                    </div>
                </section>

                <footer className="master-record footer">
                    {isEditing ? (
                    <>
                        <button onClick={handleSave}>Save</button>
                        <button onClick={handleCancel}>Cancel</button>
                    </>
                    ) : (
                    <>
                        <button onClick={handleExitMasterRecordButton}>Exit Master Record</button>
                        <button onClick={() => {
                            setIsEditing(true);
                            setForm(patient);
                            setForm({
                                ...patient,
                                dob: patient.dob.slice(0,10)   /* Insure this format "1980-05-15"  instead of "1980-05-15T00:00:00.000Z" */
                            });
                        }}>Edit</button>
                    </>
                    )}
                </footer>
            </div>
        </div>
    );
}

export default MasterRecord;




