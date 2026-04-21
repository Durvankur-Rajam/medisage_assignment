const path = require("path");
const express = require("express");
const cors = require("cors");

const { createDb } = require("./db");
const projectsRouter = require("./routes/projects");
const tasksRouter = require("./routes/tasks");

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

async function main() {
  const db = await createDb();

  const app = express();
  app.disable("x-powered-by");

  app.use(cors());
  app.use(express.json({ limit: "256kb" }));

  app.get("/api/health", (req, res) => res.json({ ok: true }));

  app.use("/api/projects", projectsRouter(db));
  app.use("/api", tasksRouter(db));

  // Serve the UI
  const webDir = path.join(__dirname, "..", "..", "web");
  app.use(express.static(webDir));
  app.get("*", (req, res) => res.sendFile(path.join(webDir, "index.html")));

  // Error handler (keep last)
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    const status = err.statusCode && Number.isFinite(err.statusCode) ? err.statusCode : 500;
    const message = status === 500 ? "Internal server error" : err.message;
    // Log server-side for debugging
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(status).json({ error: { message } });
  });

  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Server running on http://localhost:${PORT}`);
    // eslint-disable-next-line no-console
    console.log(`API base: http://localhost:${PORT}/api`);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

