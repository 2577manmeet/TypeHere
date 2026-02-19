# TypeHere - Code Editor with Cloud Sync

A minimalist browser-based code editor with syntax highlighting, multiple tabs, and cloud synchronization across devices.

## Features

- **Syntax highlighting** for multiple languages (auto-detected by highlight.js)
- **Dark/light mode** toggle
- **Line numbers** that sync with scrolling
- **Multiple tabs** with custom names
- **Cloud sync** - Login with username/PIN to sync across devices
- **Auto-save** to browser local storage
- **Tab key support** (inserts 4 spaces)
- **Add/close/rename tabs**
- **Clear all content** option

## Tech Stack

### Frontend
- Pure JavaScript (no frameworks)
- [highlight.js](https://highlightjs.org/) for syntax highlighting
- localStorage for local persistence

### Backend
- Node.js + Express
- PostgreSQL database
- bcrypt for password hashing
- CORS enabled

## Deployment on Railway

### Prerequisites
- GitHub account
- Railway account

### Steps

1. **Push to GitHub** (if not already done):
```bash
git add .
git commit -m "Code editor with cloud sync"
git push
```

2. **Create PostgreSQL Database on Railway**:
   - Go to [railway.app](https://railway.app)
   - Click "New Project"
   - Select "Provision PostgreSQL"
   - Copy the `DATABASE_URL` from the database settings

3. **Deploy Backend**:
   - In the same project, click "New Service"
   - Select "GitHub Repo"
   - Choose your repository
   - Railway will auto-detect and deploy

4. **Set Environment Variables**:
   - In your service settings, add:
     - `DATABASE_URL` - (paste from PostgreSQL service)
     - `NODE_ENV` - `production`
   - Railway will automatically set `PORT`

5. **Generate Domain**:
   - Go to Settings → Generate Domain
   - Your app will be live at the generated URL

### Cost
- ~$5-10/month on Railway (database + backend service)

## Local Development

1. **Install dependencies**:
```bash
cd backend
npm install
```

2. **Set up environment variables**:
Create `backend/.env`:
```
DATABASE_URL=postgresql://user:password@localhost:5432/typehere
NODE_ENV=development
PORT=3000
```

3. **Run PostgreSQL locally** (using Docker):
```bash
docker run --name typehere-db -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres
```

4. **Start the server**:
```bash
cd backend
npm start
```

5. **Open in browser**:
```
http://localhost:3000
```

## Usage

### Local Mode
- Just start typing - everything saves to localStorage
- Works offline

### Cloud Sync Mode
1. Click the cloud icon (☁)
2. Register with a username (4-16 chars) and PIN (4-16 chars)
3. Your code syncs automatically every 30 seconds
4. Login from any device with the same credentials

### Security
- PINs are hashed with bcrypt (never stored in plain text)
- Username must be unique
- All data is tied to your account

## API Endpoints

- `POST /api/register` - Create new account
- `POST /api/login` - Login
- `GET /api/tabs/:userId` - Get all tabs
- `POST /api/tabs` - Save/update tab
- `DELETE /api/tabs/:userId/:tabId` - Delete tab
- `DELETE /api/tabs/:userId` - Clear all tabs
- `GET /api/health` - Health check

## Project Structure

```
├── frontend/
│   ├── index.html       # Main HTML
│   ├── style.css        # Styles
│   └── script.js        # Frontend logic + sync
├── backend/
│   ├── server.js        # Express API
│   ├── package.json     # Dependencies
│   └── .env.example     # Environment template
├── railway.json         # Railway config
└── README.md
```

## License

MIT
