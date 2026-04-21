const express = require("express");
const { createTaskSchema, updateTaskSchema, parsePagination } = require("../validators");
const { nextId, nowIso } = require("../db");

function paginate(items, page, limit) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * limit;
  const data = items.slice(start, start + limit);
  return { page: safePage, limit, total, totalPages, data };
}

function normalizeSort(query) {
  const sort = (query.sort ?? "due_date").toString();
  const order = (query.order ?? "asc").toString().toLowerCase();
  const safeSort = sort === "due_date" ? "due_date" : "due_date";
  const safeOrder = order === "desc" ? "desc" : "asc";
  return { sort: safeSort, order: safeOrder };
}

module.exports = function tasksRouter(db) {
  const router = express.Router();

  router.post("/projects/:projectId/tasks", async (req, res, next) => {
    try {
      const projectId = parseInt(req.params.projectId, 10);
      if (!Number.isFinite(projectId)) return res.status(400).json({ error: { message: "Invalid project id" } });

      const project = db.data.projects.find((p) => p.id === projectId);
      if (!project) return res.status(404).json({ error: { message: "Project not found" } });

      const parsed = createTaskSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: { message: "Validation error", details: parsed.error.flatten() } });
      }

      const task = {
        id: nextId(db, "task"),
        project_id: projectId,
        title: parsed.data.title,
        description: parsed.data.description ?? "",
        status: parsed.data.status,
        priority: parsed.data.priority,
        due_date: parsed.data.due_date,
        created_at: nowIso()
      };

      db.data.tasks.push(task);
      await db.write();

      return res.status(201).json(task);
    } catch (err) {
      return next(err);
    }
  });

  router.get("/projects/:projectId/tasks", (req, res) => {
    const projectId = parseInt(req.params.projectId, 10);
    if (!Number.isFinite(projectId)) return res.status(400).json({ error: { message: "Invalid project id" } });

    const project = db.data.projects.find((p) => p.id === projectId);
    if (!project) return res.status(404).json({ error: { message: "Project not found" } });

    const { page, limit } = parsePagination(req.query);
    const { order } = normalizeSort(req.query);
    const statusFilter = (req.query.status ?? "").toString().trim();

    let items = db.data.tasks.filter((t) => t.project_id === projectId);
    if (statusFilter) items = items.filter((t) => t.status === statusFilter);

    items = [...items].sort((a, b) => {
      const aTime = Date.parse(a.due_date);
      const bTime = Date.parse(b.due_date);
      return order === "desc" ? bTime - aTime : aTime - bTime;
    });

    return res.json(paginate(items, page, limit));
  });

  router.put("/tasks/:id", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (!Number.isFinite(id)) return res.status(400).json({ error: { message: "Invalid task id" } });

      const idx = db.data.tasks.findIndex((t) => t.id === id);
      if (idx === -1) return res.status(404).json({ error: { message: "Task not found" } });

      const parsed = updateTaskSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: { message: "Validation error", details: parsed.error.flatten() } });
      }

      db.data.tasks[idx] = { ...db.data.tasks[idx], ...parsed.data };
      await db.write();

      return res.json(db.data.tasks[idx]);
    } catch (err) {
      return next(err);
    }
  });

  router.delete("/tasks/:id", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (!Number.isFinite(id)) return res.status(400).json({ error: { message: "Invalid task id" } });

      const before = db.data.tasks.length;
      db.data.tasks = db.data.tasks.filter((t) => t.id !== id);
      const deleted = before !== db.data.tasks.length;
      if (!deleted) return res.status(404).json({ error: { message: "Task not found" } });

      await db.write();
      return res.status(204).send();
    } catch (err) {
      return next(err);
    }
  });

  return router;
};

