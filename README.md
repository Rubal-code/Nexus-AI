# Nexus-AI

Nexus-AI is an AI project currently under development.

## Current Project Structure

```text
Nexus-AI/
│
├── backend/
│   ├── gateway/
│   │   ├── index.js
│   │   ├── package.json
│   │   ├── package-lock.json
│   │   └── .env
│   │
│   └── services/
│       └── auth/
│           ├── config/
│           │   └── db.js
│           ├── index.js
│           ├── package.json
│           ├── package-lock.json
│           └── .env
│
├── frontend/
│
├── shared/
│   └── excalidraw_files/
│
├── .gitignore
└── README.md
```

## Backend

The backend currently contains two services:

### API Gateway

The API Gateway is an Express.js service running on:

```text
Port: 8000
```

It is intended to act as the entry point for backend requests.

### Authentication Service

The authentication service is an Express.js service running on:

```text
Port: 8001
```

Currently, it contains a basic endpoint:

```http
GET /
```

which returns:

```json
{
  "message": "Auth service is running"
}
```

## Database

The Authentication Service is connected to **MongoDB Atlas** using **Mongoose**.

The database connection is configured in:

```text
backend/services/auth/config/db.js
```

The MongoDB connection string is stored in the service's `.env` file using:

```env
MONGODB_URI=...
```

Database credentials are kept in `.env` and are excluded from Git.

## Environment Variables

### Gateway

```env
PORT=8000
```

### Authentication Service

```env
PORT=8001
MONGODB_URI=...
```

Actual credentials should never be committed to the repository.

## Technologies Used

* Node.js
* Express.js
* MongoDB Atlas
* Mongoose
* Nodemon
* npm
* Git
* GitHub

## Running the Gateway

```bash
cd backend/gateway
npm install
npm run dev
```

The Gateway runs on:

```text
http://localhost:8000
```

## Running the Authentication Service

```bash
cd backend/services/auth
npm install
npm run dev
```

The Authentication Service runs on:

```text
http://localhost:8001
```

## Git

Sensitive files and dependencies are excluded using `.gitignore`, including:

```text
.env
node_modules/
```

## Current Status

The project currently has:

* Express API Gateway setup
* Authentication service setup
* MongoDB Atlas configuration
* Mongoose database connection setup
* Environment variable configuration
* Nodemon development setup
* Git repository initialized
* Basic project structure established
