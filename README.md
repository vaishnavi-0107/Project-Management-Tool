# Project-Management-Tool
A web-based project management tool designed to help users organize tasks, track progress, and collaborate efficiently in real time.
# ProjectFlow 🚀
### Production-Ready Project Management Tool

A full-stack Trello/Asana-style project management application built with React, Node.js, MongoDB, and Socket.io.

---

## ✨ Features

| Feature | Details |
|---------|---------|
| 🔐 **Auth** | JWT login/register, bcrypt passwords, auto token refresh |
| 📋 **Projects** | Create, edit, delete; role-based access (Admin/Member) |
| 🗂️ **Boards** | Multiple boards per project, custom backgrounds |
| 🃏 **Kanban** | Drag-and-drop columns & cards (dnd-kit) |
| ✅ **Tasks** | Assignees, due dates, priorities, checklists, labels, cover colors |
| 💬 **Comments** | Threaded discussions, @mentions, emoji reactions, live typing indicators |
| 🔔 **Notifications** | Real-time in-app alerts via Socket.io |
| 🌙 **Dark Mode** | System-aware, persisted to localStorage |
| 📡 **Real-time** | Socket.io — task moves, comments, notifications sync instantly |
| 👥 **Team** | Invite members by email or ID, manage roles |

---

## 📁 Folder Structure

```
projectflow/
├── backend/
│   ├── config/
│   │   └── database.js          # MongoDB connection
│   ├── controllers/
│   │   ├── authController.js    # Auth logic
│   │   ├── boardController.js   # Board + column CRUD
│   │   ├── commentController.js # Comments + reactions
│   │   ├── notificationController.js
│   │   ├── projectController.js # Project + member management
│   │   ├── taskController.js    # Tasks + drag/drop reorder
│   │   └── userController.js    # User search
│   ├── middlewares/
│   │   ├── auth.js              # JWT verify middleware
│   │   └── errorHandler.js      # Global error handler + asyncHandler
│   ├── models/
│   │   ├── Board.js             # Board + columns (embedded)
│   │   ├── Comment.js           # Threaded comments
│   │   ├── Notification.js      # In-app notifications (TTL 30d)
│   │   ├── Project.js           # Project + members
│   │   ├── Task.js              # Tasks + checklist + attachments
│   │   └── User.js              # User + bcrypt + avatar
│   ├── routes/
│   │   ├── auth.js
│   │   ├── boards.js
│   │   ├── comments.js
│   │   ├── notifications.js
│   │   ├── projects.js
│   │   ├── tasks.js
│   │   └── users.js
│   ├── sockets/
│   │   └── socketManager.js     # Socket.io server + rooms
│   ├── utils/
│   │   └── jwt.js               # Token generation helpers
│   ├── .env.example
│   ├── package.json
│   └── server.js                # Express entry point
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── auth/
    │   │   │   └── ProtectedRoute.jsx
    │   │   ├── board/
    │   │   │   └── InviteMemberModal.jsx
    │   │   ├── notifications/
    │   │   │   └── NotificationPanel.jsx
    │   │   ├── shared/
    │   │   │   ├── AppLayout.jsx    # Root layout with sidebar
    │   │   │   ├── Avatar.jsx       # User avatar w/ fallback initials
    │   │   │   ├── LoadingScreen.jsx
    │   │   │   ├── Modal.jsx        # Reusable modal
    │   │   │   └── Sidebar.jsx      # Nav + projects + dark mode
    │   │   └── task/
    │   │       └── TaskModal.jsx    # Full task detail + comments
    │   ├── pages/
    │   │   ├── DashboardPage.jsx    # Project grid + create modal
    │   │   ├── LoginPage.jsx
    │   │   ├── ProfilePage.jsx
    │   │   ├── ProjectPage.jsx      # Kanban board + DnD
    │   │   └── RegisterPage.jsx
    │   ├── services/
    │   │   ├── api.js               # Axios + auto-refresh interceptors
    │   │   └── socket.js            # Socket.io client
    │   ├── store/
    │   │   ├── authStore.js         # Zustand auth state
    │   │   ├── notificationStore.js
    │   │   └── themeStore.js        # Dark mode
    │   ├── styles/
    │   │   └── index.css            # Tailwind + design tokens + components
    │   ├── App.jsx
    │   └── main.jsx
    ├── .env.example
    ├── index.html
    ├── package.json
    ├── postcss.config.js
    ├── tailwind.config.js
    └── vite.config.js
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+
- **MongoDB** (local or [Atlas](https://cloud.mongodb.com))
- **npm** or **yarn**

---

### 1. Clone & Install

```bash
# Clone repo
git clone <your-repo-url> projectflow
cd projectflow

# Install backend deps
cd backend
npm install

# Install frontend deps
cd ../frontend
npm install
```

---

### 2. Configure Environment Variables

**Backend** — copy and edit:
```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:
```env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://localhost:27017/projectflow
JWT_SECRET=your_super_secret_jwt_key_min_32_chars_change_me
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your_refresh_secret_key_change_me
CLIENT_URL=http://localhost:5173
```

**Frontend** — copy and edit:
```bash
cd ../frontend
cp .env.example .env
```

Edit `frontend/.env`:
```env
VITE_SOCKET_URL=http://localhost:5000
```

---

### 3. Start MongoDB

```bash
# macOS (Homebrew)
brew services start mongodb-community

# Linux
sudo systemctl start mongod

# Windows
net start MongoDB

# Or use Docker
docker run -d -p 27017:27017 --name mongodb mongo:7
```

---

### 4. Run the Application

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
# API running on http://localhost:5000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
# App running on http://localhost:5173
```

Open **http://localhost:5173** in your browser.

---

## 🔌 API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login, returns JWT |
| POST | `/api/auth/refresh` | Refresh access token |
| GET | `/api/auth/me` | Current user profile |
| PUT | `/api/auth/profile` | Update profile |
| PUT | `/api/auth/password` | Change password |

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | List user's projects |
| POST | `/api/projects` | Create project |
| GET | `/api/projects/:id` | Get project |
| PUT | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Delete project |
| POST | `/api/projects/:id/members` | Add member |
| DELETE | `/api/projects/:id/members/:userId` | Remove member |

### Boards
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/boards?projectId=xxx` | List boards |
| POST | `/api/boards` | Create board |
| PUT | `/api/boards/:id` | Update board |
| DELETE | `/api/boards/:id` | Delete board |
| POST | `/api/boards/:id/columns` | Add column |
| PUT | `/api/boards/:id/columns/:colId` | Update column |
| DELETE | `/api/boards/:id/columns/:colId` | Delete column |
| PUT | `/api/boards/:id/columns/reorder` | Reorder columns |

### Tasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks?boardId=xxx` | List tasks |
| POST | `/api/tasks` | Create task |
| GET | `/api/tasks/:id` | Get task |
| PUT | `/api/tasks/:id` | Update task |
| DELETE | `/api/tasks/:id` | Delete task |
| PUT | `/api/tasks/reorder` | Drag-drop reorder |
| POST | `/api/tasks/:id/watch` | Toggle watching |

### Comments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/comments?taskId=xxx` | Get task comments |
| POST | `/api/comments` | Add comment |
| PUT | `/api/comments/:id` | Edit comment |
| DELETE | `/api/comments/:id` | Delete comment |
| POST | `/api/comments/:id/react` | Add/toggle reaction |

---

## 📡 WebSocket Events

### Client → Server
| Event | Payload | Description |
|-------|---------|-------------|
| `project:join` | `projectId` | Join project room |
| `project:leave` | `projectId` | Leave project room |
| `task:join` | `taskId` | Join task room (live comments) |
| `task:leave` | `taskId` | Leave task room |
| `typing:start` | `{ taskId }` | Show typing indicator |
| `typing:stop` | `{ taskId }` | Hide typing indicator |

### Server → Client
| Event | Payload | Description |
|-------|---------|-------------|
| `task:created` | Task object | New task added |
| `task:updated` | Task object | Task was edited |
| `task:deleted` | `{ taskId }` | Task removed |
| `task:moved` | `{ taskId, destColumnId }` | Task moved between columns |
| `board:created` | Board object | New board |
| `column:created` | `{ boardId, column }` | New column |
| `comment:created` | Comment object | New comment on task |
| `comment:updated` | Comment object | Comment edited |
| `comment:deleted` | `{ commentId }` | Comment deleted |
| `notification:new` | Notification object | In-app notification |
| `typing:start` | `{ userId, user }` | Someone is typing |
| `typing:stop` | `{ userId }` | Stopped typing |

---

## 🏗️ Production Deployment

### Backend (Railway / Render / Heroku)

1. Set environment variables in your hosting platform
2. Use MongoDB Atlas for cloud database
3. Build command: `npm install`
4. Start command: `node server.js`

### Frontend (Vercel / Netlify)

1. Set `VITE_API_URL` to your backend URL
2. Set `VITE_SOCKET_URL` to your backend URL
3. Build command: `npm run build`
4. Output directory: `dist`

### Docker Compose (optional)

```yaml
version: '3.8'
services:
  mongo:
    image: mongo:7
    ports: ["27017:27017"]
    volumes: [mongo_data:/data/db]

  backend:
    build: ./backend
    ports: ["5000:5000"]
    environment:
      - MONGO_URI=mongodb://mongo:27017/projectflow
      - JWT_SECRET=your_secret
      - CLIENT_URL=http://localhost:5173
    depends_on: [mongo]

  frontend:
    build: ./frontend
    ports: ["5173:80"]
    environment:
      - VITE_API_URL=http://localhost:5000
      - VITE_SOCKET_URL=http://localhost:5000

volumes:
  mongo_data:
```

---

## 🧩 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS + CSS variables |
| State | Zustand |
| Routing | React Router v6 |
| Drag & Drop | dnd-kit |
| Backend | Node.js + Express |
| Database | MongoDB + Mongoose |
| Auth | JWT + bcryptjs |
| Real-time | Socket.io |
| HTTP Client | Axios (auto-refresh interceptors) |
| Dates | date-fns |
| Notifications | react-hot-toast |

---

## 🔒 Security Features

- **Helmet.js** — HTTP security headers
- **Rate limiting** — 100 req/15min global, 20 req/15min for auth
- **JWT** — Short-lived access tokens (7d) + refresh tokens (30d)
- **bcrypt** — Password hashing with cost factor 12
- **Input validation** — Mongoose schema-level validation
- **CORS** — Restricted to frontend origin
- **Auth middleware** — All protected routes verify JWT

---

## 📝 License

MIT — free for personal and commercial use.
