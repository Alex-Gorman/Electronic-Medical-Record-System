# 🏥 Electronic Medical Record System

A modern web-based Electronic Medical Record (EMR) system built with React and Docker. This system provides a structured and efficient interface for managing patient data and medical records.

---

## 🚀 How to Run the Project

Follow the steps below to run the project locally using Docker.

### 📥 1. Clone the Repository

Clone the repository using SSH:

```bash
git clone git@github.com:Alex-Gorman/Electronic-Medical-Record-System.git
```


### 📁 2. Navigate to the Directory

```bash
cd Electronic-Medical-Record-System
```


### 🐳 3. Run the Application with Docker

```bash
docker compose up --build
```

### 4. Open a New Terminal Window
Open a new terminal window or tab so you can attach to the container while the app is running.


### 🔗 5. Attach to the Frontend Container

```bash
docker attach emr-frontend
```

### 🌐 6. Access the Application
```bash
http://localhost:3000
```

## Screenshots

### Main menu
![Main menu](docs/images/main-menu.png)

### Login page
![Login page](docs/images/login-page.png)

### Add appointment page
![Add appointment page](docs/images/add-appointment-page.png)

### Edit appointment page
![Edit appointment page](docs/images/edit-appointment-page.png)

### Calendar popup
![Calendar popup](docs/images/calendar-popup.png)

### Add demographic record page
![Add demographic record page](docs/images/add-demographic-record-page.png)

### Patient search page
![Patient search page](docs/images/patient-search-page.png)

### Master record page
![Master record page](docs/images/master-record.png)

### Master record edit page
![Master record edit page](docs/images/master-record-edit-page.png)



## Documentation
- [AppointmentFormPopup component](/docs/AppointmentFormPopup.md)
- [SearchPage component](/docs/SearchPage.md)
- [App - Application Shell & Routing](/docs/App.md)
- [Navbar component](/docs/Navbar.md)
- [CalendarPopup component](/docs/CalendarPopup.md)
- [LoginPage component](/docs/LoginPage.md)
- [MainMenu component](/docs/MainMenu.md)
- [MasterRecord component](/docs/MasterRecord.md)
- [CreateDemographic component](/docs/CreateDemographic.md)
- [Server component](/docs/Server.md)









