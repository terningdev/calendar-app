# Maps Feature Setup Guide

## Overview
The Maps feature allows you to visualize tickets with addresses on a Google Map. This helps track the geographical distribution of tickets and plan technician routes.

## Prerequisites
1. A Google Cloud Platform account
2. Google Maps JavaScript API enabled
3. An API key with the following APIs enabled:
   - Maps JavaScript API
   - Geocoding API
   - Places API (optional, for future enhancements)

## Setup Instructions

### 1. Get Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Maps JavaScript API" and enable it
   - Search for "Geocoding API" and enable it
4. Create an API key:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API Key"
   - Copy the generated API key
5. (Recommended) Restrict the API key:
   - Click on the API key you just created
   - Under "Application restrictions", select "HTTP referrers"
   - Add your domain (e.g., `https://yourdomain.com/*`)
   - Under "API restrictions", select "Restrict key"
   - Select only the APIs you're using

### 2. Configure the Application

1. Create a `.env` file in the `frontend` directory:
   ```bash
   cp .env.example .env
   ```

2. Add your Google Maps API key to the `.env` file:
   ```
   REACT_APP_GOOGLE_MAPS_API_KEY=your_actual_api_key_here
   ```

3. Restart the development server if it's running:
   ```bash
   npm start
   ```

### 3. Add Addresses to Tickets

1. Navigate to the Tickets page
2. When creating or editing a ticket, fill in the "Address" field
3. Use complete addresses for best results (e.g., "Kongens gate 1, 7011 Trondheim, Norway")
4. The address should be recognizable by Google Maps Geocoding API

## Features

### Current Features
- **Map Visualization**: Shows all tickets with addresses as markers on a Google Map
- **Geocoding**: Automatically converts addresses to coordinates
- **Info Windows**: Click on markers to view ticket details
- **Auto-fit Bounds**: Map automatically adjusts to show all ticket locations
- **Refresh Button**: Reload tickets to see updates
- **Ticket Counter**: Shows how many tickets have addresses

### Address Field
The address field has been added to the ticket model:
- **Location**: Ticket creation/edit form
- **Optional**: Address is not required for tickets
- **Format**: Free-text field accepting any address format
- **Best Practice**: Use complete addresses (street, city, postal code, country)

## Usage

1. **View Maps**: Click "Maps" in the navigation menu
2. **Add Ticket with Address**:
   - Go to Tickets page
   - Click "Create Ticket"
   - Fill in the required fields
   - Enter an address in the "Address" field
   - Save the ticket
3. **View Ticket on Map**:
   - Navigate to Maps page
   - The ticket will appear as a marker
   - Click the marker to see ticket details

## Troubleshooting

### Map not loading
- Check that the API key is correctly set in `.env` file
- Verify the API key is not restricted to other domains
- Check browser console for error messages

### Addresses not appearing
- Ensure the address is valid and recognizable by Google Maps
- Check that the ticket has an address field filled in
- Some addresses may fail geocoding if they're too vague or invalid

### API Quota Exceeded
- Google Maps has free tier limits
- Check your [Google Cloud Console](https://console.cloud.google.com/) usage
- Consider setting up billing alerts
- Optimize by caching geocoded results (future enhancement)

## Future Enhancements
- Route planning for technicians
- Clustering for many nearby tickets
- Custom marker colors based on ticket status/priority
- Address autocomplete in ticket forms
- Caching geocoded addresses to reduce API calls
- Filter tickets on map by date, technician, or department
- Distance calculations between tickets

## Database Changes

The following changes were made to support the Maps feature:

### Backend (MongoDB)
- Added `address` field to Ticket model:
  ```javascript
  address: {
    type: String,
    required: false,
    trim: true
  }
  ```

### Frontend
- Added `address` field to ticket forms
- Created new Maps page component
- Added Maps route to navigation

## API Usage and Costs

### Free Tier
Google Maps Platform provides $200 of free usage per month, which includes:
- Maps JavaScript API: 28,000 map loads per month
- Geocoding API: 40,000 requests per month

### Typical Usage
- Each page load of the Maps component = 1 map load
- Each ticket with an address = 1 geocoding request (per session)

For most applications, this should stay within the free tier.
