# MusiNotes

A music notes application for creating and managing song lyrics with chords.

## Features

- User authentication (email/password and Google OAuth)
- Create, edit, and delete songs
- Search and filter songs
- Export songs as PDF
- Account management with secure deletion

## Setup

### Prerequisites

- Node.js (v14 or higher)
- PostgreSQL
- npm or yarn

### Installation

1. Clone the repository
2. Install backend dependencies:
   ```bash
   cd musiNotes/backend
   npm install
   ```

3. Install frontend dependencies:
   ```bash
   cd ../frontend
   npm install
   ```

4. Set up the database:
   - Create a PostgreSQL database named `musiNotes`
   - Run the initialization script:
     ```bash
     cd backend
     node init_db.js
     ```

### Configuration

#### Backend Configuration (`musiNotes/backend/.env`)

```env
# Database Configuration
DB_USER=postgres
DB_HOST=localhost
DB_DATABASE=musiNotes
DB_PASSWORD=your_postgres_password
DB_PORT=5432

# JWT Configuration
JWT_SECRET=your_super_secure_jwt_secret_key_change_this_in_production
JWT_EXPIRES_IN=1h

# Application Configuration
NODE_ENV=development
LOG_LEVEL=info
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:3001
PORT=3001

# Session Secret
SESSION_SECRET=your_session_secret_change_in_production

# Google OAuth (Optional - see setup below)
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID_HERE
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET_HERE

# Email Configuration (for password reset)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_password
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
```

#### Frontend Configuration (`musiNotes/frontend/.env`)

```env
# Frontend Environment Variables
REACT_APP_API_URL=http://localhost:3001/api
REACT_APP_GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID_HERE
GENERATE_SOURCEMAP=false
```

### Google OAuth Setup (Optional)

To enable Google login:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google+ API" and enable it
4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Configure the OAuth consent screen if prompted
   - Set Application type to "Web application"
   - Add authorized redirect URIs: `http://localhost:3001/api/auth/google/callback`
5. Copy the Client ID and Client Secret
6. Update your `.env` files:
   - Backend: Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
   - Frontend: Set `REACT_APP_GOOGLE_CLIENT_ID`

### Running the Application

1. Start the backend:
   ```bash
   cd musiNotes/backend
   npm run dev
   ```

2. Start the frontend:
   ```bash
   cd musiNotes/frontend
   npm start
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/google` - Google OAuth login
- `GET /api/auth/google/callback` - Google OAuth callback
- `DELETE /api/auth/delete-account` - Delete user account

### Songs
- `GET /api/songs` - Get all songs (with search/filter)
- `GET /api/songs/:id` - Get single song
- `POST /api/songs` - Create new song
- `PUT /api/songs/:id` - Update song
- `DELETE /api/songs/:id` - Delete song
- `GET /api/songs/:id/pdf` - Download song as PDF

## Database Schema

The application uses PostgreSQL with the following main tables:
- `users` - User accounts
- `songs` - Song data (title, artist, lyrics, etc.)

## Technologies Used

- **Backend**: Node.js, Express.js, PostgreSQL, Passport.js
- **Frontend**: React, Tailwind CSS
- **Authentication**: JWT, Google OAuth 2.0
- **PDF Generation**: PDFKit
- **Email**: Nodemailer

## Security Features

- Password hashing with bcrypt
- JWT authentication
- Rate limiting
- Input validation and sanitization
- CORS configuration
- Helmet security headers
- SQL injection prevention

## License

This project is for educational purposes.