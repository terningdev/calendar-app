# Ticket Management System

A comprehensive web application for managing support tickets, technicians, and departments with a responsive calendar view.

## Features

- **Dashboard**: Overview of ticket statistics and recent tickets
- **Ticket Management**: Create, edit, delete, and filter tickets
- **Calendar View**: Visual representation of scheduled tickets with color-coded status
- **Technician Management**: Manage technicians with department assignments and skills
- **Department Management**: Organize technicians into departments
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## Technology Stack

### Backend
- Node.js with Express.js
- MongoDB with Mongoose ODM
- JWT authentication (prepared)
- Input validation with express-validator
- CORS enabled for frontend communication

### Frontend
- React 18 with functional components and hooks
- React Router for navigation
- React Big Calendar for calendar view
- Axios for API communication
- React Toastify for notifications
- Responsive CSS Grid and Flexbox

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local installation or MongoDB Atlas)

### Installation

1. **Clone or navigate to the project directory**
   ```bash
   cd c:\dev\Calendar
   ```

2. **Install Backend Dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Install Frontend Dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Set up Environment Variables**
   
   Update `backend/.env` with your MongoDB connection string:
   ```
   NODE_ENV=development
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/ticket_management
   JWT_SECRET=your_jwt_secret_key_here
   ```

### Running the Application

1. **Start MongoDB** (if running locally)
   ```bash
   mongod
   ```

2. **Start the Backend Server**
   ```bash
   cd backend
   npm run dev
   ```
   The backend will run on http://localhost:5000

3. **Start the Frontend Development Server**
   ```bash
   cd frontend
   npm start
   ```
   The frontend will run on http://localhost:3000

## API Endpoints

### Departments
- `GET /api/departments` - Get all departments
- `POST /api/departments` - Create new department
- `PUT /api/departments/:id` - Update department
- `DELETE /api/departments/:id` - Delete department

### Technicians
- `GET /api/technicians` - Get all technicians
- `POST /api/technicians` - Create new technician
- `PUT /api/technicians/:id` - Update technician
- `DELETE /api/technicians/:id` - Delete technician
- `GET /api/technicians/department/:id` - Get technicians by department

### Tickets
- `GET /api/tickets` - Get all tickets (with filtering)
- `POST /api/tickets` - Create new ticket
- `PUT /api/tickets/:id` - Update ticket
- `DELETE /api/tickets/:id` - Delete ticket
- `GET /api/tickets/calendar` - Get tickets for calendar view
- `POST /api/tickets/:id/notes` - Add note to ticket

## Usage

### 1. Set up Departments
- Navigate to the Departments page
- Create departments like "IT Support", "Maintenance", "Help Desk"

### 2. Add Technicians
- Go to the Technicians page
- Add technicians and assign them to departments
- Add skills for each technician

### 3. Create Tickets
- Use the Tickets page to create new support tickets
- Assign tickets to technicians
- Set priority, category, and scheduled date/time

### 4. View Calendar
- Use the Calendar page for a visual overview of scheduled tickets
- Click on tickets to view details
- Color coding shows ticket status at a glance

## Project Structure

```
Calendar/
├── backend/
│   ├── models/          # Database models
│   ├── routes/          # API route handlers
│   ├── middleware/      # Custom middleware
│   ├── server.js        # Express server setup
│   └── package.json
└── frontend/
    ├── src/
    │   ├── components/  # Reusable React components
    │   ├── pages/       # Page components
    │   ├── services/    # API service functions
    │   ├── styles/      # CSS styles
    │   └── App.js       # Main React component
    └── package.json
```

## Customization

### Adding New Ticket Categories
Update the `categories` array in `frontend/src/pages/Tickets.js` and the enum in `backend/models/Ticket.js`.

### Modifying Calendar Colors
Update the `eventStyleGetter` function in `frontend/src/pages/Calendar.js`.

### Adding Authentication
The backend is prepared for JWT authentication. Implement login/register endpoints and update the frontend accordingly.

## Troubleshooting

### Backend Issues
- Ensure MongoDB is running
- Check the connection string in `.env`
- Verify all dependencies are installed

### Frontend Issues
- Ensure the backend is running on port 5000
- Check browser console for errors
- Verify all npm packages are installed

### Calendar Not Loading
- Check that tickets have valid `scheduledDate` values
- Ensure the backend calendar endpoint is working
- Verify date formatting in the frontend

## Contributing

1. Create a new branch for your feature
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

This project is licensed under the MIT License.