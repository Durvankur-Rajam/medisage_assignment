const express = require("express");
const { createProjectSchema, parsePagination } = require("../validators");
const { nextId, nowIso } = require("../db");

function paginate(items, page, limit) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * limit;
  const data = items.slice(start, start + limit);
  return { page: safePage, limit, total, totalPages, data };
}

module.exports = function projectsRouter(db) {
  const router = express.Router();

  router.post("/", async (req, res, next) => {
    try {
      const parsed = createProjectSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: { message: "Validation error", details: parsed.error.flatten() } });
      }

      const project = {
        id: nextId(db, "project"),
        name: parsed.data.name,
        description: parsed.data.description ?? "",
        created_at: nowIso()
      };

      db.data.projects.push(project);
      await db.write();

      return res.status(201).json(project);
    } catch (err) {
      return next(err);
    }
  });

  router.get("/", (req, res) => {
    const { page, limit } = parsePagination(req.query);
    const items = [...db.data.projects].sort((a, b) => b.id - a.id);
    return res.json(paginate(items, page, limit));
  });

  router.get("/:id", (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: { message: "Invalid project id" } });

    const project = db.data.projects.find((p) => p.id === id);
    if (!project) return res.status(404).json({ error: { message: "Project not found" } });

    return res.json(project);
  });

  router.delete("/:id", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (!Number.isFinite(id)) return res.status(400).json({ error: { message: "Invalid project id" } });

      const before = db.data.projects.length;
      db.data.projects = db.data.projects.filter((p) => p.id !== id);
      const deleted = before !== db.data.projects.length;
      if (!deleted) return res.status(404).json({ error: { message: "Project not found" } });

      db.data.tasks = db.data.tasks.filter((t) => t.project_id !== id);
      await db.write();

      return res.status(204).send();
    } catch (err) {
      return next(err);
    }
  });

  return router;
};

