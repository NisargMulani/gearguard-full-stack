# Quick Setup Guide

## Project Structure

```
gearguard-frontend/
├── frontend/          # React frontend (port 5173)
│   ├── src/
│   ├── package.json
│   └── .env          # VITE_API_BASE=http://localhost:5000/api
│
├── backend/          # Express backend (port 5000)
│   ├── server.js
│   ├── package.json
│   └── .env          # Supabase credentials
│
└── README.md         # Full documentation
```

## Quick Start

### 1. Install Backend Dependencies
```bash
cd backend
npm install
```

### 2. Setup Backend Environment
Create `backend/.env`:
```env
SUPABASE_URL=https://xdrunpmtqbzfrabvwmzr.supabase.co
SUPABASE_ANON_KEY=sb_publishable_r3OhWFI5Y4E75Ctu2VNywA_16l3bLrK
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

### 3. Install Frontend Dependencies
```bash
cd frontend
npm install
```

### 4. Setup Frontend Environment
Create `frontend/.env`:
```env
VITE_API_BASE=http://localhost:5000/api
```

### 5. Run Both Servers

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

### 6. Open Application
Navigate to: `http://localhost:5173`

## Database Setup

Run the SQL schema in your Supabase SQL Editor to create all tables and policies.

## Notes

- Backend must be running before frontend can make API calls
- Both servers need to run simultaneously
- Backend handles all Supabase communication
- Frontend only communicates with backend API

