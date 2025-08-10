/**
 * @file CreateDemographic.js
 * @module CreateDemographic
 * @description
 * Form to create a new patient demographic record. Loads provider list,
 * validates inputs via HTML constraints, and submits to the backend.
 *
 * ## Backend endpoints used (base http://localhost:3002)
 * - GET  /doctors          → load list of doctor names
 * - POST /patients         → create a new patient with submitted form data
 */


import React, { useState, useEffect } from 'react';
import './CreateDemographic.css';


/**
 * Shape of the payload sent to the backend `/patients` endpoint.
 * (Keys match your DB column names.)
 * @typedef {Object} PatientCreatePayload
 * @property {string} firstname
 * @property {string} lastname
 * @property {string} [preferredname]
 * @property {string} [address]
 * @property {string} [city]
 * @property {string} province
 * @property {string} [postalcode]                       // "A1A 1A1"
 * @property {string} [homephone]                        // 10 digits
 * @property {string} [workphone]                        // 10 digits
 * @property {string} [cellphone]                        // 10 digits
 * @property {string} email
 * @property {string} dob                                // "YYYY-MM-DD"
 * @property {"M"|"F"|"Other"|""} sex
 * @property {string} [healthinsurance_number]           // 10 digits
 * @property {string} [healthinsurance_version_code]     // 2 caps
 * @property {"active"|"not enrolled"} patient_status
 * @property {string} family_physician                   // doctor name
 */


/**
 * Immutable list of Canadian provinces shown in the Province select.
 * @constant
 * @type {string[]}
 */
const PROVINCES = [
  'Ontario', 'Quebec', 'Nova Scotia', 'New Brunswick',
  'Manitoba', 'British Columbia', 'Prince Edward Island',
  'Saskatchewan', 'Alberta', 'Newfoundland and Labrador',
];


/**
 * CreateDemographic component
 *
 * Renders a two-column form that collects basic demographic information
 * and posts it to the backend to create a patient record.
 *
 * @returns {JSX.Element}
 *
 * @example
 * // In a router:
 * <Route path="/create-demographic" element={<CreateDemographic />} />
 */
function CreateDemographic() {
  /**
   * Current form values keyed by backend field names.
   * @type {[Partial<PatientCreatePayload>, Function]}
   */
  const [formData, setFormData] = useState({});

  /**
   * List of available doctor names (string[]) for the Family Physician dropdown.
   * @type {[string[], Function]}
   */
  const [doctors, setDoctors] = useState([]);

  /**
   * Success message shown after a successful POST.
   * @type {[string, Function]}
   */
  const [successMessage, setSuccessMessage] = useState('');

  /**
   * Load the list of doctors once on mount.
   */
  useEffect(() => {
    fetch('http://localhost:3002/doctors')
      .then((res) => res.json())           // Parse the JSON response
      .then((data) => setDoctors(data))    // Set the list of doctors
      .catch((err) => console.error('Failed to fetch doctors:', err)); // Handle any error
  }, []);


  /* ===== Handlers ===== */


  /**
   * Generic controlled-input handler. Updates a single field in {@link formData}.
   *
   * @param {React.ChangeEvent<HTMLInputElement|HTMLSelectElement>} e
   * @returns {void}
   */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };


  /**
   * Submit handler. Sends the current {@link formData} to POST /patients.
   * Displays a success message or alerts on failure.
   *
   * @param {React.FormEvent<HTMLFormElement>} e
   * @returns {Promise<void>}
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch('http://localhost:3002/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const text = await res.text(); // read body no matter what
      if (!res.ok) {
        console.error('POST /patients failed:', res.status, text);
        alert(`Save failed (${res.status}): ${text || res.statusText}`);
        return;
      }

      const data = text ? JSON.parse(text) : null;
      setSuccessMessage('✅ Patient Created Successfully');
      console.log('Created patient:', data);
    } catch (err) {
      console.error('Network/parse error:', err);
      alert('An unexpected error occurred while saving the patient.');
    }
  };


  /* === Render === */


  return (
    <div className="create-demographic-container">
      <h2>Add a Demographic Record</h2>

      {successMessage ? (
        <div className="success-message">
          <h3> {successMessage}</h3>
        </div>
      ) : (

      <form className="demographic-form" onSubmit={handleSubmit}>
        {/* Main form */}

        {/* LEFT COLUMN of form */}
        <div className="form-column">
          {/* First Name */}
          <div className="form-row">
            <label>First Name:</label>
            <input type="text" name="firstname" pattern="^[A-Z][a-z]*$" title="First letter capital, letters only" required onChange={handleChange} />
          </div>

          {/* Last Name */}
          <div className="form-row">
            <label>Last Name:</label>
            <input type="text" name="lastname" pattern="^[A-Z][a-z]*$" title="First letter capital, letters only" required onChange={handleChange} />
          </div>

          {/* Preferred Name */}
          <div className="form-row">
            <label>Preferred Name:</label>
            <input type="text" name="preferredname" pattern="^[A-Za-z]+$" onChange={handleChange} />
          </div>

          {/* Address */}
          <div className="form-row">
            <label>Address:</label>
            <input type="text" name="address" pattern="^[A-Za-z0-9 ]+$" title="No special characters" onChange={handleChange} />
          </div>

          {/* City */}
          <div className="form-row">
            <label>City:</label>
            <input type="text" name="city" pattern="^[A-Za-z ]+$" title="Letters only" onChange={handleChange} />
          </div>

          {/* Province Dropdown */}
          <div className="form-row">
            <label>Province:</label>
            <select name="province" required onChange={handleChange}>
              <option value="">Select Province</option>
              {PROVINCES.map((prov) => (
                <option key={prov} value={prov}>{prov}</option>
              ))}
            </select>
          </div>

          {/* Postal Code */}
          <div className="form-row">
            <label>Postal Code:</label>
            <input type="text" name="postalcode" pattern="^[A-Za-z]\d[A-Za-z] \d[A-Za-z]\d$" title="Format A1A 1A1" onChange={handleChange} />
          </div>

          {/* Home Phone */}
          <div className="form-row">
            <label>Home Phone:</label>
            <input type="tel" name="homephone" pattern="^\d{10}$" title="10 digits only" onChange={handleChange} />
          </div>

          {/* Work Phone */}
          <div className="form-row">
            <label>Work Phone:</label>
            <input type="tel" name="workphone" pattern="^\d{10}$" title="10 digits only" onChange={handleChange} />
          </div>

          {/* Cell Phone */}
          <div className="form-row">
            <label>Cell Phone:</label>
            <input type="tel" name="cellphone" pattern="^\d{10}$" title="10 digits only" onChange={handleChange} />
          </div>
        </div>

        {/* RIGHT COLUMN of form */}
        <div className="form-column">
          {/* Email */}
          <div className="form-row">
            <label>Email:</label>
            <input type="email" name="email" required onChange={handleChange} />
          </div>

          {/* Date of Birth */}
          <div className="form-row">
            <label>DOB:</label>
            <input type="date" name="dob" required onChange={handleChange} />
          </div>

          {/* Sex Dropdown */}
          <div className="form-row">
            <label>Sex:</label>
            <select name="sex" onChange={handleChange}>
              <option value="">Select</option>
              <option value="M">Male</option>
              <option value="F">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Health Insurance Number */}
          <div className="form-row">
            <label>Health Ins. #:</label>
            <input type="text" name="healthinsurance_number" pattern="^\d{10}$" title="Exactly 10 digits" onChange={handleChange} />
          </div>

          {/* Version Code */}
          <div className="form-row">
            <label>Version Code:</label>
            <input type="text" name="healthinsurance_version_code" pattern="^[A-Z]{2}$" title="2 capital letters" onChange={handleChange} />
          </div>

          {/* Status Dropdown */}
          <div className="form-row">
            <label>Status:</label>
            <select name="patient_status" onChange={handleChange}>
              <option value="active">Active</option>
              <option value="not enrolled">Not Enrolled</option>
            </select>
          </div>

          {/* Doctor Dropdown (populated from database) */}
          <div className="form-row">
            <label>Family Physician:</label>
            <select name="family_physician" onChange={handleChange} required>
              <option value="">Select a doctor</option>
              {doctors.map((doc, idx) => (
                <option key={idx} value={doc}>{doc}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Submit Button */}
        <div className="form-submit">
          <button type="submit" className="submit-button">Create Patient</button>
        </div>
      </form>
      )}
    </div>
  );
}

export default CreateDemographic;


