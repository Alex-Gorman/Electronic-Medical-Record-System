import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import './MasterRecord.css';

function MasterRecord() {
    const {search} = useLocation();
    const params = new URLSearchParams(search);
    const patientId = params.get('patientId');

    const [patient, setPatient] = useState(null);
    const [error, setError] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [form, setForm] = useState({});
    const [doctors, setDoctors] = useState([]);
    const [fieldErrors, setFieldErrors] = useState({})

    /* 1. Fetch the patient info */
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
                setPatient({ 
                    ...data, 
                    dob: data.dob.slice(0,10)    // trim the timestamp
                }); 
            })
            .catch(err => {
                console.error("Error loading patient record: ", err);
                setError('Failed to load: ' + err.message);
            }); 
        }, [patientId]);
    
    /* 2. Fetch the list of Doctors */
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

    /* 3. When the form.healthNumber or form.healthVersion change, re-validate they are correct format */ 
    useEffect(() => {
        const errs = {}

        /* healthNumber must be exactly 10 digits */
        if (form.healthNumber != null) {
            if (!/^\d{10}$/.test(form.healthNumber)) {
                errs.healthNumber = 'Must be exactly 10 digits'
            }
        }

        /* healthVersion must be exactly two uppercase letters */
        if (form.healthVersion != null) {
            if (!/^[A-Z]{2}$/.test(form.healthVersion)) {
                errs.healthVersion = 'Must be exactly two uppercase letters'
            }
        }

        /* email must look like aaa@bbb.ccc */
        if (form.email != null) {
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
                errs.email = 'Invalid email address'
            }
        }

        /* Canadian postal code: A1A 1A1 or A1A1A1 */
        if (form.postalcode != null) {
            if (!/^[A-Za-z]\d[A-Za-z][ ]?\d[A-Za-z]\d$/.test(form.postalcode)) {
                errs.postalcode = 'Invalid Canadian postal code'
            }
        }

        setFieldErrors(errs)
    }, [form.healthNumber, form.healthVersion, form.email, form.postalcode]);
    
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


    /**
     * When the input in the form changes, this function will run
     * @param {*} event 
     */
    function handleChange(event) {
 
        /* Get the element that fired the event */
        const target = event.target;

        /* Read the name of the attribute being edited */
        const inputName = target.name;

        /* Get the value of the attribute getting edited */
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

    /* When the cancel button is pressed */
    const handleCancel = () => {
        /* reset form data back to last saved patient data */
        setForm(patient);
        setIsEditing(false);
    };

    /* Handle the clicking of the save button, when changing patient info */
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




