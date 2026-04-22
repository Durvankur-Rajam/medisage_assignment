## Megisage_Assignment

### Tech stack

- **Backend**: Node.js + Express
- **Data store**: JSON file
- **Frontend**: Simple HTML/CSS/JS UI (served by the backend)

### Setup & run

Prereqs: Node.js 18+ (recommended).

```bash
cd server
npm install
npm run dev
```

Then open `http://localhost:3000/`.

### API base URL

- **Base**: `http://localhost:3000/api`
- **Health**: `GET /api/health`

### Database design 

- **Projects**
  - `id`, `name`, `description`, `created_at`
- **Tasks**
  - `id`, `project_id`, `title`, `description`, `status`, `priority`, `due_date`, `created_at`

### Required APIs 

#### Project APIs

- **POST** `/projects`
- **GET** `/projects?page=1&limit=10` (pagination)
- **GET** `/projects/{id}`
- **DELETE** `/projects/{id}` (also deletes the project’s tasks)

#### Task APIs

- **POST** `/projects/{project_id}/tasks`
- **GET** `/projects/{project_id}/tasks?status=todo&sort=due_date&order=asc&page=1&limit=10`
  - Filtering by `status`
  - Sorting by `due_date`
  - Pagination via `page` + `limit`
- **PUT** `/tasks/{id}`
- **DELETE** `/tasks/{id}`

### UI demo

- Open the app at `http://localhost:3000/`
- Click **Seed demo data** to populate sample projects/tasks quickly.

