# 🧠 Interactive Quiz Platform - "The Arena"

A real-time, immersive quiz application designed for team-based competitions. Features a sci-fi/cyberpunk aesthetic, live leaderboards, and secure admin controls.

## ✨ Features

-   ** immersive UI:** Glassmorphism design, animated backgrounds, and responsive layouts.
-   **🛡️ Team Authentication:** Secure login for multiple teams with progress tracking.
-   **⏱️ Real-time Synchronization:** Global server-side timer ensures all participants are perfectly synced.
-   **📊 Live Leaderboard:** Admin panel with real-time score updates and team management.
-   **🚫 Anti-Cheat & Security:** 
    -   Fullscreen enforcement.
    -   Tab-switch detection (warnings & disqualification).
    -   Secure API routes with JWT authentication.
    -   Prevent dev-tools inspection (right-click disable).
-   **📱 Responsive:** Fully functional on Desktops, Tablets, and Mobile devices.

## 🛠️ Tech Stack

### Client (Frontend)
-   **Framework:** Next.js 15 (App Router)
-   **Language:** TypeScript
-   **Styling:** Tailwind CSS, Framer Motion
-   **State:** React Context API
-   **HTTP:** Axios

### Server (Backend)
-   **Runtime:** Node.js
-   **Framework:** Express.js
-   **Database:** MongoDB (Mongoose)
-   **Authentication:** JWT (JSON Web Tokens)
-   **Deployment:** Vercel Serverless ready

---

## 🚀 Getting Started

### 1. Prerequisites
-   Node.js (v18+)
-   MongoDB Database (Local or Atlas)
-   Git

### 2. Installation

Clone the repository:
```bash
git clone <your-repo-url>
cd quiz-app
```

#### Backend Setup
```bash
cd server
npm install
```

#### Frontend Setup
```bash
cd ../client
npm install
```

### 3. Configuration

#### Server (`server/.env`)
Create a `.env` file in the `server` directory:
```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_super_secret_jwt_key
CLIENT_URL=http://localhost:3000
```

#### Client (`client/.env.local`)
Create a `.env.local` file in the `client` directory:
```env
# For Local Development
NEXT_PUBLIC_API_URL=http://localhost:5000/api

# For Vercel Production (Example)
# NEXT_PUBLIC_API_URL=https://your-server-app.vercel.app/api
```

### 4. Running Locally

**Start the Backend:**
```bash
cd server
npm run dev
# Server runs on http://localhost:5000
```

**Start the Frontend:**
```bash
cd client
npm run dev
# Client runs on http://localhost:3000
```

---

## 🌐 Deployment Guide (Vercel)

This project is configured for easy deployment on Vercel.

### Backend (Server)
1.  Push your code to GitHub.
2.  Import the `server` directory as a new project in Vercel.
3.  Set Framework Preset to **Other**.
4.  Add Environment Variables (`MONGO_URI`, `JWT_SECRET`, etc.).
5.  Deploy.

### Frontend (Client)
1.  Import the `client` directory as a new project in Vercel.
2.  Set Framework Preset to **Next.js**.
3.  Add Environment Variable:
    -   `NEXT_PUBLIC_API_URL`: Your deployed server URL **appended with `/api`** (e.g., `https://my-server.vercel.app/api`).
4.  Deploy.

> **Note:** Ensure your MongoDB Atlas IP Access List allows access from Vercel (0.0.0.0/0).

---

## 📂 Project Structure

```
quiz-app/
├── client/             # Next.js Frontend
│   ├── app/            # App Router Pages (Quiz, Admin, Login)
│   ├── components/     # Reusable UI Components (Modal, Toast)
│   ├── context/        # Auth Context
│   └── utils/          # API helpers
│
└── server/             # Express Backend
    ├── models/         # Mongoose Schemas (Team, Question, Settings)
    ├── routes/         # API Routes (Auth, Quiz, Admin)
    └── vercel.json     # Vercel Deployment Config
```

## 📜 License
This project is for educational and event purposes.
