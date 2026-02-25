# EduConnect Project Overview

## Project Summary

EduConnect is a full-stack Learning Management System (LMS) designed for Kerala polytechnics. It aims to be a production-ready website with a modern, professional architecture, featuring attendance tracking, exam hall tickets, certificates, and student dashboards. The project emphasizes OTP-based authentication, JWT token management, responsive UI with Tailwind CSS, and a modular architecture.

**Current Status**: DEVELOPMENT PHASE - BETA (Version 1.0.0-beta)

## Tech Stack

### Frontend
- **Framework**: React 18.3.1 with TypeScript
- **Styling**: Tailwind CSS 4.1.12 with tailwindcss-animate, Radix UI (for additional styling)
- **Routing**: React Router DOM v7
- **Build Tool**: Vite 6.3.5
- **Icons**: Lucide React 0.487.0
- **Forms**: React Hook Form 7.55.0
- **Charts**: Recharts 2.15.2
- **Notifications**: Sonner 2.0.3
- **State Management**: Built-in React Context API, React Hooks, localStorage
- **HTTP Client**: Axios

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js 4.22.1
- **Database**: MySQL2 3.16.3 or PostgreSQL 8.11.3 (MongoDB/PostgreSQL as per ARCHITECTURE.md)
- **Cache**: Redis 4.6.12
- **Authentication**: JWT (jsonwebtoken 9.1.2), Bcryptjs 2.4.3
- **Security**: Helmet 7.1.0
- **File Upload**: Multer 2.0.2
- **QR Code**: Qrcode 1.5.3
- **Task Queue**: Bull 4.11.4
- **HTTP Client**: Axios 1.13.2

## Architecture Overview

EduConnect follows a client-server architecture with a React-based frontend and an Express.js-based Node.js backend.

### Frontend
The frontend is built with React and Vite, using React Router for navigation and Tailwind CSS for styling. It leverages Radix UI for components and Axios for API communication. User authentication tokens are stored in `localStorage`.

### Backend
The backend is an Express.js application written in TypeScript, featuring a modular architecture with distinct layers for middleware, route handlers (controllers), business logic (services), and data access (models/DB). It handles authentication using JWT and OTP, interacts with a database (MySQL/PostgreSQL), and uses Redis for caching.

### Data Flow Highlights
-   **Signup Flow**: Multi-step process involving user input validation, OTP generation/verification, and JWT issuance.
-   **Login Flow**: Credentials validation leading to JWT issuance.
-   **Token Management**: JWT tokens are stored in `localStorage` on the frontend and sent in the `Authorization` header for protected API requests.

### Key Architectural Concepts
-   **Modular Design**: Backend organized into modules (auth, student, announcements) and layers (config, middleware, services, utils).
-   **Type Safety**: Extensive use of TypeScript across both frontend and backend.
-   **Responsive Design**: Frontend designed with Tailwind CSS for responsiveness across devices.
-   **Authentication**: OTP-based signup/login and JWT-based session management.

## Installation

### Prerequisites
-   Node.js 18+ and npm
-   MySQL 8.0+ or PostgreSQL 12+ (for database)
-   Redis (optional, for caching)

### Setup Steps

1.  **Clone and Install Dependencies**
    ```bash
    cd educonnect
    npm install
    cd frontend && npm install
    cd ../backend && npm install
    cd ..
    ```

2.  **Configure Environment Variables**
    ```bash
    cp .env.example .env
    # Edit .env with your database and service credentials
    ```

3.  **Create Database**
    ```sql
    CREATE DATABASE educonnect;
    -- Import schema files if provided
    ```

4.  **Install tailwindcss-animate** (if not already included)
    ```bash
    cd frontend
    npm install -D tailwindcss-animate
    cd ..
    ```

## Running the Application

### Option 1: Start Both Servers Together
```bash
npm run dev:all
```

### Option 2: Start Servers Separately
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### Option 3: Use Startup Script
```bash
./start-project.sh
```

## Available Scripts

### Root Level
-   `npm run dev:all` - Start both frontend and backend with live reload
-   `npm run dev:frontend` - Start frontend development server
-   `npm run dev:backend` - Start backend development server
-   `npm run build:frontend` - Build frontend for production
-   `npm run build:backend` - Build backend
-   `npm run start` - Start backend server in production mode

### Frontend (`frontend/package.json`)
-   `npm run dev` - Start Vite dev server (port 5173)
-   `npm run build` - Build for production
-   `npm run preview` - Preview production build

### Backend (`backend/package.json`)
-   `npm run dev` - Start with nodemon for auto-reload
-   `npm run start` - Start server (port 3000)

## API Endpoints

### Authentication
-   `POST /api/v1/auth/send-otp` - Send OTP to phone
-   `POST /api/v1/auth/verify-otp` - Verify OTP and get JWT token
-   `POST /api/v1/auth/check-user` - Check if user exists by phone
-   `POST /api/v1/auth/resend-otp` - Resend OTP

### Announcements
-   `GET /api/v1/announcements` - Get all announcements (public)
-   `POST /api/v1/announcements` - Create announcement (admin only)

### Students
-   `GET /api/v1/students/:roll/dashboard` - Student dashboard
-   `GET /api/v1/students/:roll/attendance` - Student attendance
-   `GET /api/v1/students/:roll/grades` - Student grades
-   `POST /api/v1/students/:roll/condonation` - Request attendance condonation
-   `GET /api/v1/students/:roll/exam-hall-ticket` - Get exam hall ticket
-   `GET /api/v1/students/:roll/certificates` - Get certificates

## Development Conventions

-   **Language**: TypeScript for both frontend and backend for type safety.
-   **Frontend Styling**: Tailwind CSS for utility-first styling, Radix UI for accessible components.
-   **Backend Structure**: Modular, feature-based organization with clear separation of concerns (middleware, controllers, services).
-   **Code Quality**: Strict TypeScript mode, descriptive commit messages, use of ESLint/Prettier (implied by `tsconfig.json` and common practice in such stacks).
-   **Testing**: Manual testing is currently performed, with plans for unit, integration, and E2E tests.

## Environment Variables

See `.env.example` for all configuration options, including:
-   `PORT` - Backend server port (default: 3000)
-   `JWT_SECRET` - Secret key for JWT tokens
-   `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` - Database credentials
-   `REDIS_HOST`, `REDIS_PORT` - Redis connection
-   `VITE_API_URL` - Frontend API endpoint

## Troubleshooting

### Port Already in Use
```bash
# Kill process using port
lsof -ti:3000 | xargs kill -9  # Backend
lsof -ti:5173 | xargs kill -9  # Frontend
```

### esbuild Version Mismatch (Frontend)
```bash
cd frontend
npm uninstall esbuild
npm install --save-dev esbuild@0.25.12
```

### Missing Dependencies
```bash
cd frontend
npm install lucide-react @radix-ui/react-slot class-variance-authority clsx tailwind-merge
npm install tailwindcss-animate

cd ../backend
npm install @types/pg @types/qrcode @types/redis
```
