// src/CreateDemographic/CreateDemographic.js
import React, { useState, useEffect } from 'react';
import './CreateDemographic.css';

function CreateDemographic() {
  // State to store form data as key-value pairs
  const [formData, setFormData] = useState({});

  // State to store list of doctors retrieved from backend
  const [doctors, setDoctors] = useState([]);

  /* State to see if the patient was created sucessfully */
  const [successMessage, setSuccessMessage] = useState('');

  // List of Canadian provinces used in dropdown
  const provinces = [
    'Ontario', 'Quebec', 'Nova Scotia', 'New Brunswick',
    'Manitoba', 'British Columbia', 'Prince Edward Island',
    'Saskatchewan', 'Alberta', 'Newfoundland and Labrador'
  ];

  // useEffect to fetch doctors when component mounts
  useEffect(() => {
    fetch('http://localhost:3002/doctors')
      .then((res) => res.json())           // Parse the JSON response
      .then((data) => setDoctors(data))    // Set the list of doctors
      .catch((err) => console.error('Failed to fetch doctors:', err)); // Handle any error
  }, []);

  // Handles input changes and updates state accordingly
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Handles form submission
  const handleSubmit = (e) => {
    e.preventDefault();

    fetch('http://localhost:3002/patients', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to save patient');
        return res.json();
      })
      .then((data) => {
        setSuccessMessage('✅ Patient Created Successfully'); // ← Show message
        console.log(data);
        // You can keep formData if you want to let users see what they submitted
        // or optionally disable the form after submission
      })
      // .then((data) => {
      //   alert('Patient created successfully!');
      //   console.log(data);
      //   // Optionally reset form
      //   setFormData({});
      // })
      .catch((err) => {
        console.error(err);
        alert('An error occurred while saving the patient.');
      });
  };


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
              {provinces.map((prov) => (
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


