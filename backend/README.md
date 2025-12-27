# GearGuard Backend API

Express.js backend server that acts as a proxy between the frontend and Supabase.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file (copy from `.env.example`):
```env
SUPABASE_URL=https://xdrunpmtqbzfrabvwmzr.supabase.co
SUPABASE_ANON_KEY=sb_publishable_r3OhWFI5Y4E75Ctu2VNywA_16l3bLrK
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

3. Start the server:
```bash
npm run dev
# or
npm start
```

The server will run on `http://localhost:5000`

## API Endpoints

All endpoints are prefixed with `/api`. See the main README.md for full API documentation.

