# GearGuard - Maintenance Management System

A full-stack maintenance management application with separated frontend and backend architecture.

## Project Structure

```
gearguard-frontend/
├── frontend/          # React frontend application
│   ├── src/          # React source code
│   ├── public/       # Static assets
│   └── package.json  # Frontend dependencies
├── backend/          # Express.js backend API
│   ├── server.js     # Main server file
│   └── package.json  # Backend dependencies
└── README.md         # This file
```

## Architecture

- **Frontend**: React 18 + Vite
- **Backend**: Express.js + Node.js
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth (via backend)

The frontend communicates with the backend API, which then communicates with Supabase. This provides:
- Better security (Supabase keys stay on backend)
- Centralized error handling
- Easier to add middleware, logging, etc.
- Better separation of concerns

## Setup Instructions

### Prerequisites

- Node.js 16+ and npm
- Supabase account and project

### 1. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend` folder:

```env
SUPABASE_URL=Replace with database url
SUPABASE_ANON_KEY=replace with the database api
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

Start the backend server:

```bash
npm run dev
# or
npm start
```

The backend will run on `http://localhost:5000`

### 2. Frontend Setup

```bash
cd frontend
npm install
```

Create a `.env` file in the `frontend` folder:

```env
VITE_API_BASE=http://localhost:5000/api
```

Start the frontend development server:

```bash
npm run dev
```

The frontend will run on `http://localhost:5173`

### 3. Database Setup

1. Go to your Supabase project SQL Editor
2. Run the SQL schema provided (the full SQL code with tables, RLS policies, etc.)
3. This will create all necessary tables, enums, triggers, and security policies

## Running the Application

You need to run both servers:

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Then open `http://localhost:5173` in your browser.

## API Endpoints

All API endpoints are prefixed with `/api`:

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/signup` - User registration

### Dashboard
- `GET /api/dashboard/summary` - Dashboard summary statistics
- `GET /api/dashboard/recent-requests` - Recent maintenance requests

### Equipment
- `GET /api/equipment` - List all equipment
- `GET /api/equipment/meta` - Get metadata for equipment forms
- `GET /api/equipment/:id` - Get equipment details
- `POST /api/equipment` - Create new equipment
- `PUT /api/equipment/:id` - Update equipment
- `DELETE /api/equipment/:id` - Delete equipment

### Maintenance Requests
- `GET /api/requests` - List all requests
- `GET /api/requests/meta` - Get metadata for request forms
- `GET /api/requests/:id/details` - Get request details with notes, instructions, worksheet
- `POST /api/requests` - Create new request
- `PUT /api/requests/:id/stage` - Update request stage
- `POST /api/requests/:id/notes` - Add note to request
- `POST /api/requests/:id/instructions` - Add instruction to request
- `POST /api/requests/:id/worksheet` - Add worksheet comment

### Other
- `GET /api/workcenters` - List work centers
- `GET /api/teams` - List teams with members
- `GET /api/health` - Health check endpoint

## Authentication Flow

1. User logs in via frontend
2. Frontend sends credentials to `/api/auth/login`
3. Backend authenticates with Supabase
4. Backend returns user data and session token
5. Frontend stores session token in localStorage
6. Frontend includes token in `Authorization: Bearer <token>` header for subsequent requests
7. Backend validates token with Supabase before processing requests

## Security

- Supabase API keys are stored only on the backend
- Frontend uses session tokens for authenticated requests
- Row Level Security (RLS) policies in Supabase enforce data access control
- CORS is configured to only allow requests from the frontend URL

## Development

### Backend Development

The backend uses Express.js and communicates with Supabase. All business logic and data transformations happen in the backend.

### Frontend Development

The frontend is a React SPA that makes HTTP requests to the backend API. The frontend no longer directly communicates with Supabase.

## Building for Production

### Backend

The backend can be run directly with Node.js or deployed to platforms like:
- Heroku
- Railway
- Render
- AWS Lambda (with serverless framework)

### Frontend

```bash
cd frontend
npm run build
```

The built files will be in `frontend/dist` and can be deployed to:
- Vercel
- Netlify
- AWS S3 + CloudFront
- Any static hosting service

## Environment Variables

### Backend (.env)
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anon/public key
- `PORT` - Backend server port (default: 5000)
- `NODE_ENV` - Environment (development/production)
- `FRONTEND_URL` - Frontend URL for CORS

### Frontend (.env)
- `VITE_API_BASE` - Backend API base URL

## License

This project is for internal use.
