const { z } = require("zod");

const TaskStatus = z.enum(["todo", "in-progress", "done"]);
const TaskPriority = z.enum(["low", "medium", "high"]);

const isoDate = z
  .string()
  .refine((s) => !Number.isNaN(Date.parse(s)), { message: "Invalid date (expected ISO date string)" });

const createProjectSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional().default("")
});

const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(4000).optional().default(""),
  status: TaskStatus.optional().default("todo"),
  priority: TaskPriority.optional().default("medium"),
  due_date: isoDate
});

const updateTaskSchema = z
  .object({
    title: z.string().trim().min(1).max(160).optional(),
    description: z.string().trim().max(4000).optional(),
    status: TaskStatus.optional(),
    priority: TaskPriority.optional(),
    due_date: isoDate.optional()
  })
  .refine((obj) => Object.keys(obj).length > 0, { message: "No fields provided to update" });

function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page ?? "1", 10) || 1);
  const limitRaw = parseInt(query.limit ?? "10", 10) || 10;
  const limit = Math.min(100, Math.max(1, limitRaw));
  return { page, limit };
}

module.exports = {
  TaskStatus,
  TaskPriority,
  createProjectSchema,
  createTaskSchema,
  updateTaskSchema,
  parsePagination
};

