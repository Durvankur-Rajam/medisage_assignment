const API_BASE = "/api";

const els = {
  seedBtn: document.getElementById("seedBtn"),

  projectSearch: document.getElementById("projectSearch"),
  newProjectBtn: document.getElementById("newProjectBtn"),
  projectsList: document.getElementById("projectsList"),
  projectsEmpty: document.getElementById("projectsEmpty"),
  prevProjects: document.getElementById("prevProjects"),
  nextProjects: document.getElementById("nextProjects"),
  projectsMeta: document.getElementById("projectsMeta"),

  activeProjectLabel: document.getElementById("activeProjectLabel"),
  newTaskBtn: document.getElementById("newTaskBtn"),
  statusFilter: document.getElementById("statusFilter"),
  orderByDue: document.getElementById("orderByDue"),
  tasksGrid: document.getElementById("tasksGrid"),
  tasksEmpty: document.getElementById("tasksEmpty"),
  prevTasks: document.getElementById("prevTasks"),
  nextTasks: document.getElementById("nextTasks"),
  tasksMeta: document.getElementById("tasksMeta"),

  projectDialog: document.getElementById("projectDialog"),
  projectForm: document.getElementById("projectForm"),
  projectDialogTitle: document.getElementById("projectDialogTitle"),
  projectName: document.getElementById("projectName"),
  projectDescription: document.getElementById("projectDescription"),
  projectError: document.getElementById("projectError"),
  projectSubmit: document.getElementById("projectSubmit"),

  taskDialog: document.getElementById("taskDialog"),
  taskForm: document.getElementById("taskForm"),
  taskDialogTitle: document.getElementById("taskDialogTitle"),
  taskTitle: document.getElementById("taskTitle"),
  taskDescription: document.getElementById("taskDescription"),
  taskStatus: document.getElementById("taskStatus"),
  taskPriority: document.getElementById("taskPriority"),
  taskDueDate: document.getElementById("taskDueDate"),
  taskError: document.getElementById("taskError"),
  taskSubmit: document.getElementById("taskSubmit"),

  toast: document.getElementById("toast")
};

const state = {
  projectsPage: 1,
  projectsLimit: 8,
  projectsTotalPages: 1,
  projectsQuery: "",

  activeProject: null,

  tasksPage: 1,
  tasksLimit: 8,
  tasksTotalPages: 1
};

function toast(msg) {
  els.toast.textContent = msg;
  els.toast.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (els.toast.hidden = true), 2400);
}

function fmtDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
  } catch {
    return iso;
  }
}

function taskStatusTag(status) {
  if (status === "todo") return { label: "Todo", cls: "tag tag--todo" };
  if (status === "in-progress") return { label: "In progress", cls: "tag tag--progress" };
  return { label: "Done", cls: "tag tag--done" };
}

function taskPriorityTag(priority) {
  if (priority === "low") return { label: "Low", cls: "tag tag--low" };
  if (priority === "high") return { label: "High", cls: "tag tag--high" };
  return { label: "Medium", cls: "tag tag--medium" };
}

async function api(path, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    ...opts
  });

  if (res.status === 204) return null;
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.error?.message || `Request failed (${res.status})`;
    const details = json?.error?.details;
    const err = new Error(msg);
    err.details = details;
    throw err;
  }
  return json;
}

function showError(el, err) {
  el.hidden = false;
  const details = err?.details;
  if (!details) {
    el.textContent = err.message || "Something went wrong";
    return;
  }
  el.textContent = `${err.message}\n${JSON.stringify(details, null, 2)}`;
}

function clearError(el) {
  el.hidden = true;
  el.textContent = "";
}

async function loadProjects() {
  const page = state.projectsPage;
  const limit = state.projectsLimit;
  const q = state.projectsQuery.trim().toLowerCase();

  const result = await api(`/projects?page=${page}&limit=${limit}`);
  let items = result.data;
  if (q) items = items.filter((p) => p.name.toLowerCase().includes(q) || (p.description || "").toLowerCase().includes(q));

  renderProjects(items, { page: result.page, totalPages: result.totalPages, total: result.total });
}

function renderProjects(items, meta) {
  els.projectsList.innerHTML = "";
  els.projectsEmpty.hidden = items.length !== 0;

  els.projectsMeta.textContent = `Page ${meta.page} / ${meta.totalPages} • ${meta.total} total`;
  state.projectsTotalPages = meta.totalPages;
  els.prevProjects.disabled = meta.page <= 1;
  els.nextProjects.disabled = meta.page >= meta.totalPages;

  for (const p of items) {
    const card = document.createElement("div");
    card.className = `projectCard ${state.activeProject?.id === p.id ? "isActive" : ""}`;
    card.tabIndex = 0;

    const left = document.createElement("div");
    left.className = "projectCard__meta";
    left.innerHTML = `
      <div class="projectCard__name">${escapeHtml(p.name)}</div>
      <div class="projectCard__desc">${escapeHtml(p.description || "—")}</div>
      <div class="projectCard__row">
        <span class="pill">#${p.id}</span>
        <span class="pill">Created ${fmtDate(p.created_at)}</span>
      </div>
    `;

    const actions = document.createElement("div");
    actions.className = "cardActions";
    actions.innerHTML = `
      <button class="iconBtn iconBtn--danger" title="Delete project" aria-label="Delete project">🗑</button>
    `;

    actions.querySelector("button").addEventListener("click", async (e) => {
      e.stopPropagation();
      if (!confirm(`Delete project "${p.name}" and all its tasks?`)) return;
      await api(`/projects/${p.id}`, { method: "DELETE" });
      toast("Project deleted");
      if (state.activeProject?.id === p.id) {
        state.activeProject = null;
        setActiveProjectUI(null);
      }
      await loadProjects();
    });

    card.addEventListener("click", async () => {
      state.activeProject = p;
      state.tasksPage = 1;
      setActiveProjectUI(p);
      await loadProjects();
      await loadTasks();
    });
    card.addEventListener("keydown", async (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        card.click();
      }
    });

    card.append(left, actions);
    els.projectsList.append(card);
  }
}

function setActiveProjectUI(project) {
  const has = !!project;
  els.newTaskBtn.disabled = !has;
  els.statusFilter.disabled = !has;
  els.orderByDue.disabled = !has;
  els.prevTasks.disabled = !has;
  els.nextTasks.disabled = !has;
  els.activeProjectLabel.textContent = has ? `Project: ${project.name} (#${project.id})` : "Select a project to view tasks.";
  if (!has) {
    els.tasksGrid.innerHTML = "";
    els.tasksEmpty.hidden = true;
    els.tasksMeta.textContent = "—";
  }
}

async function loadTasks() {
  if (!state.activeProject) return;

  const projectId = state.activeProject.id;
  const page = state.tasksPage;
  const limit = state.tasksLimit;
  const status = els.statusFilter.value;
  const order = els.orderByDue.value;

  const qs = new URLSearchParams({ page: String(page), limit: String(limit), sort: "due_date", order });
  if (status) qs.set("status", status);

  const result = await api(`/projects/${projectId}/tasks?${qs.toString()}`);
  renderTasks(result.data, { page: result.page, totalPages: result.totalPages, total: result.total });
}

function renderTasks(items, meta) {
  els.tasksGrid.innerHTML = "";
  els.tasksEmpty.hidden = items.length !== 0;

  els.tasksMeta.textContent = `Page ${meta.page} / ${meta.totalPages} • ${meta.total} total`;
  state.tasksTotalPages = meta.totalPages;
  els.prevTasks.disabled = meta.page <= 1;
  els.nextTasks.disabled = meta.page >= meta.totalPages;

  for (const t of items) {
    const statusTag = taskStatusTag(t.status);
    const priorityTag = taskPriorityTag(t.priority);

    const card = document.createElement("div");
    card.className = "taskCard";

    const top = document.createElement("div");
    top.className = "taskCard__top";
    top.innerHTML = `
      <div style="min-width:0">
        <div class="taskCard__title">${escapeHtml(t.title)}</div>
        <div class="muted">Due ${fmtDate(t.due_date)} • #${t.id}</div>
      </div>
      <div class="cardActions">
        <button class="iconBtn" title="Edit task" aria-label="Edit task">✎</button>
        <button class="iconBtn iconBtn--danger" title="Delete task" aria-label="Delete task">🗑</button>
      </div>
    `;

    const desc = document.createElement("div");
    desc.className = "taskCard__desc";
    desc.textContent = t.description || "—";

    const metaRow = document.createElement("div");
    metaRow.className = "taskCard__meta";
    metaRow.innerHTML = `
      <span class="${statusTag.cls}">${statusTag.label}</span>
      <span class="${priorityTag.cls}">${priorityTag.label}</span>
    `;

    const [editBtn, delBtn] = top.querySelectorAll("button");
    editBtn.addEventListener("click", () => openTaskDialog({ mode: "edit", task: t }));
    delBtn.addEventListener("click", async () => {
      if (!confirm(`Delete task "${t.title}"?`)) return;
      await api(`/tasks/${t.id}`, { method: "DELETE" });
      toast("Task deleted");
      await loadTasks();
    });

    card.append(top, desc, metaRow);
    els.tasksGrid.append(card);
  }
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function openProjectDialog() {
  clearError(els.projectError);
  els.projectDialogTitle.textContent = "New project";
  els.projectSubmit.textContent = "Create";
  els.projectName.value = "";
  els.projectDescription.value = "";
  els.projectDialog.showModal();
  els.projectName.focus();
}

async function submitProject() {
  clearError(els.projectError);
  const payload = {
    name: els.projectName.value,
    description: els.projectDescription.value
  };
  try {
    await api("/projects", { method: "POST", body: JSON.stringify(payload) });
    toast("Project created");
    await loadProjects();
    els.projectDialog.close();
  } catch (err) {
    showError(els.projectError, err);
  }
}

function openTaskDialog({ mode, task }) {
  clearError(els.taskError);
  els.taskDialogTitle.textContent = mode === "edit" ? "Edit task" : "New task";
  els.taskSubmit.textContent = mode === "edit" ? "Save changes" : "Create";
  els.taskForm.dataset.mode = mode;
  els.taskForm.dataset.taskId = mode === "edit" ? String(task.id) : "";

  els.taskTitle.value = task?.title ?? "";
  els.taskDescription.value = task?.description ?? "";
  els.taskStatus.value = task?.status ?? "todo";
  els.taskPriority.value = task?.priority ?? "medium";
  els.taskDueDate.value = (task?.due_date ?? "").slice(0, 10);

  els.taskDialog.showModal();
  els.taskTitle.focus();
}

function toIsoDateFromInput(dateStr) {
  // Convert yyyy-mm-dd to full ISO string.
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  return d.toISOString();
}

async function submitTask() {
  clearError(els.taskError);
  if (!state.activeProject) return;

  const payload = {
    title: els.taskTitle.value,
    description: els.taskDescription.value,
    status: els.taskStatus.value,
    priority: els.taskPriority.value,
    due_date: toIsoDateFromInput(els.taskDueDate.value)
  };

  const mode = els.taskForm.dataset.mode;
  const taskId = els.taskForm.dataset.taskId;

  try {
    if (mode === "edit") {
      await api(`/tasks/${taskId}`, { method: "PUT", body: JSON.stringify(payload) });
      toast("Task updated");
    } else {
      await api(`/projects/${state.activeProject.id}/tasks`, { method: "POST", body: JSON.stringify(payload) });
      toast("Task created");
    }
    els.taskDialog.close();
    await loadTasks();
  } catch (err) {
    showError(els.taskError, err);
  }
}

async function seedDemo() {
  // Create a small set of projects + tasks so the UI looks complete instantly.
  const names = [
    { name: "Website Refresh", description: "Update landing page + improve mobile performance." },
    { name: "Hiring Pipeline", description: "Track tasks for interview loop improvements." }
  ];

  for (const p of names) {
    await api("/projects", { method: "POST", body: JSON.stringify(p) });
  }

  const projects = await api(`/projects?page=1&limit=10`);
  const [p1, p2] = projects.data;

  const today = new Date();
  const plusDays = (n) => new Date(today.getTime() + n * 24 * 60 * 60 * 1000).toISOString();

  const tasks = [
    { project_id: p1.id, title: "Audit current pages", description: "Identify slow sections, broken links, and outdated copy.", status: "in-progress", priority: "high", due_date: plusDays(3) },
    { project_id: p1.id, title: "Design new hero section", description: "Modern layout and clear call-to-action.", status: "todo", priority: "medium", due_date: plusDays(6) },
    { project_id: p2.id, title: "Write interview scorecard", description: "Add criteria for role-specific evaluation.", status: "todo", priority: "low", due_date: plusDays(8) },
    { project_id: p2.id, title: "Create onboarding checklist", description: "Ensure day-1 ready accounts + docs.", status: "done", priority: "medium", due_date: plusDays(1) }
  ];

  for (const t of tasks) {
    const { project_id, ...payload } = t;
    await api(`/projects/${project_id}/tasks`, { method: "POST", body: JSON.stringify(payload) });
  }

  toast("Seeded demo data");
  state.projectsPage = 1;
  await loadProjects();
}

// Wire events
els.newProjectBtn.addEventListener("click", openProjectDialog);
els.projectForm.addEventListener("submit", (e) => {
  const action = e.submitter?.value;
  if (action === "cancel") return;
  e.preventDefault();
  submitProject();
});

els.newTaskBtn.addEventListener("click", () => openTaskDialog({ mode: "create" }));
els.taskForm.addEventListener("submit", (e) => {
  const action = e.submitter?.value;
  if (action === "cancel") return;
  e.preventDefault();
  submitTask();
});

els.projectSearch.addEventListener("input", () => {
  state.projectsQuery = els.projectSearch.value;
  loadProjects();
});

els.prevProjects.addEventListener("click", () => {
  state.projectsPage = Math.max(1, state.projectsPage - 1);
  loadProjects();
});
els.nextProjects.addEventListener("click", () => {
  state.projectsPage = Math.min(state.projectsTotalPages, state.projectsPage + 1);
  loadProjects();
});

els.prevTasks.addEventListener("click", () => {
  state.tasksPage = Math.max(1, state.tasksPage - 1);
  loadTasks();
});
els.nextTasks.addEventListener("click", () => {
  state.tasksPage = Math.min(state.tasksTotalPages, state.tasksPage + 1);
  loadTasks();
});
els.statusFilter.addEventListener("change", () => {
  state.tasksPage = 1;
  loadTasks();
});
els.orderByDue.addEventListener("change", () => {
  state.tasksPage = 1;
  loadTasks();
});

els.seedBtn.addEventListener("click", async () => {
  try {
    await seedDemo();
  } catch (err) {
    toast(err.message || "Failed to seed demo data");
  }
});

// Initial load
(async function init() {
  try {
    await api("/health");
    await loadProjects();
  } catch (err) {
    toast("Backend not running. Start the server with: cd server && npm install && npm run dev");
  }
})();

