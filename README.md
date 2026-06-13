# AI-Driven Document Intelligence System

A complete production-ready full-stack AI-powered document intelligence platform. Users can upload documents (PDFs, DOCX files, raw TXT files, and PNG/JPG images), extract text using OCR, auto-classify them into categories, generate summaries (short overview, detailed description, and core bullet points), perform semantic vector similarity search, and ask questions (RAG Chat Assistant) with chunk-level source citations.

---

## 🌟 Key Features

* **Authentication (JWT & RBAC)**: Core registration, login, logout, refresh tokens, password resets, and email verification. Admin vs User roles. First user registered gains Admin rights automatically.
* **Intelligent File OCR**: Employs `Tesseract.js` for images and `pdf-parse`/`mammoth` for document text extraction.
* **Simulated & Real-world AI Engine**: 
  - *Production*: Connects to OpenAI (`gpt-4o-mini`, embeddings models) and Pinecone for vector indexing.
  - *Local fallback*: Operates purely on a local mathematical vector cosine similarity search engine and heuristics-based summarizer/classifier. **No API keys required to test locally.**
* **Real-time Pipeline Tracking**: Integrated with `Socket.io` to stream document processing state notifications (`uploading` -> `ocr_processing` -> `chunking` -> `indexing` -> `completed` / `failed`) to the frontend in real time.
* **Semantic Search Panel**: Displays match snippets and percentages based on context similarities rather than keyword lookups.
* **Interactive AI Chat Assistant (RAG)**: Chat with documents in a chat window, with click-to-expand context source chunk references.
* **Admin Dashboard & Logs**: Features Chart.js visualizations tracking storage capacities, monthly upload trends, and logs. Includes user management and pagination audit logs.

---

## 🛠️ Tech Stack

* **Frontend**: React.js, Vite, Tailwind CSS, Redux Toolkit, React Router DOM, Axios, React Hook Form, Chart.js, Framer Motion
* **Backend**: Node.js, Express.js, JWT Authentication, Multer, Cloudinary, Socket.io, Helmet, CORS, Rate Limiting
* **Database**: MongoDB, Mongoose, Pinecone (Optional Vector DB)

---

## 📂 Project Structure

```text
internship/
├── backend/
│   ├── src/
│   │   ├── configs/       # DB, Cloudinary, Swagger YAML configs
│   │   ├── controllers/   # Auth, Document, Admin logic handlers
│   │   ├── middleware/    # Auth guards, Multer upload, global error handling
│   │   ├── models/        # Mongoose User, Document, Query, AuditLog schemas
│   │   ├── routes/        # Router maps for auth, documents, admin
│   │   ├── services/      # OCR parsing, OpenAI/simulated AI engine, Pinecone service
│   │   ├── sockets/       # Socket.io connection state emitters
│   │   ├── utils/         # Swagger setup utils
│   │   └── app.js         # Express app initialization
│   ├── server.js          # Entry server runner
│   ├── package.json       # Backend dependencies
│   └── .env               # Local configuration variables
│
├── frontend/
│   ├── src/
│   │   ├── components/    # Reusable button, modal and indicator elements
│   │   ├── layouts/       # Sidebar, Topbar, Responsive frame wrapper
│   │   ├── pages/         # Dashboard, DocumentDetail, Search, AdminDashboard, Login
│   │   ├── services/      # Axios wrapper with silent refresh interceptors
│   │   ├── store/         # Redux global state slices
│   │   ├── App.jsx        # Route maps and protectors
│   │   └── main.jsx       # Mount entry point
│   ├── package.json       # Frontend dependencies
│   └── vite.config.js     # Vite compilation proxies
│
├── Dockerfile             # Multi-stage container file
├── docker-compose.yml     # Database and server local docker setups
└── README.md              # Documentation
```

---

## 🚀 Getting Started (Local Development)

### Prerequisites

* [Node.js](https://nodejs.org/en) (v18+ recommended)
* [MongoDB](https://www.mongodb.com/try/download/community) running locally (port 27017)

### 1. Setup Backend

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy environment file template and verify properties:
   ```bash
   cp .env.example .env
   ```
4. Start backend in development mode:
   ```bash
   npm run dev
   ```

The backend server runs on `http://localhost:5000`.

### 2. Setup Frontend

1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite React development server:
   ```bash
   npm run dev
   ```

The application client runs on `http://localhost:5173`. Open it to register and test!

---

## 🐋 Run with Docker Compose

Running via Docker Compose launches both a MongoDB container instance and a compiled production MERN system container.

1. Ensure Docker is running.
2. Build and spin up containers from the root directory:
   ```bash
   docker-compose up --build
   ```
3. Access the dashboard app at `http://localhost:5000`.

---

## 📖 API Documentation & Testing

Once the backend is running, you can access the interactive Swagger Documentation at:

🔗 **`http://localhost:5000/api-docs`**

Use this panel to execute registration, test file processing, trigger queries, and verify admin controls.

---

## 🛡️ Security Implementations

* **JWT (JSON Web Tokens)**: Two-token strategy (Access Token expires in 15m, Refresh Token in 7d).
* **Bcrypt Hashing**: Multi-salt credentials encryption.
* **Helmet**: Custom security headers (e.g. CSRF safeguards, policy overrides for media assets).
* **Express Rate Limiter**: Maximum 200 requests per 15 minutes per IP.
* **CORS Limits**: Binds requests exclusively to the defined Client URL.

---

## ☁️ Deployment Guide

### Frontend (Vercel)

1. Set up a Vercel project connected to your frontend workspace.
2. Add your environmental configurations (e.g., `VITE_API_URL` pointing to the Render backend).
3. Vercel handles automated compilations from the repository.

### Backend (Render)

1. Create a Web Service on Render pointing to the backend directory.
2. Set Environment Variables:
   - `MONGO_URI` (MongoDB Atlas link)
   - `JWT_SECRET` / `JWT_REFRESH_SECRET`
   - `CLOUDINARY_URL` / `OPENAI_API_KEY` / `PINECONE_API_KEY`
3. Select Node build commands and start script (`npm start`).

### Database (MongoDB Atlas)

1. Provision a free M0 database cluster on MongoDB Atlas.
2. Configure Network Access rules allowing access.
3. Retrieve and paste the standard Connection URI in your backend `.env` variables.
