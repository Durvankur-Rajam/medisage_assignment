const path = require("path");
const fs = require("fs");
const { Low } = require("lowdb");
const { JSONFile } = require("lowdb/node");

const dataDir = path.join(__dirname, "..", "data");
const dbPath = path.join(dataDir, "db.json");

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
}

function nowIso() {
  return new Date().toISOString();
}

async function createDb() {
  ensureDataDir();
  const adapter = new JSONFile(dbPath);
  const db = new Low(adapter, {
    projects: [],
    tasks: [],
    meta: { projectSeq: 0, taskSeq: 0, created_at: nowIso() }
  });

  await db.read();
  db.data ||= { projects: [], tasks: [], meta: { projectSeq: 0, taskSeq: 0, created_at: nowIso() } };
  db.data.projects ||= [];
  db.data.tasks ||= [];
  db.data.meta ||= { projectSeq: 0, taskSeq: 0, created_at: nowIso() };
  db.data.meta.projectSeq ||= 0;
  db.data.meta.taskSeq ||= 0;
  await db.write();

  return db;
}

function nextId(db, kind) {
  if (kind === "project") {
    db.data.meta.projectSeq += 1;
    return db.data.meta.projectSeq;
  }
  if (kind === "task") {
    db.data.meta.taskSeq += 1;
    return db.data.meta.taskSeq;
  }
  throw new Error("Unknown id kind");
}

module.exports = { createDb, nextId, nowIso };

