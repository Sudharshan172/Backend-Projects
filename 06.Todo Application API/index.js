const express = require("express");
const app = express();

const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const path = require("path");

app.use(express.json());

const dbPath = path.join(__dirname, "todoApplication.db");
let db = null;
const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () => {
      console.log("Server is running on http://localhost:3000/");
    });
  } catch (error) {
    console.error("Database connection error:", error.message);
    process.exit(1);
  }
};
initializeDbAndServer();

// Get all todos with filtering
app.get("/todos/", async (req, res) => {
  const { status, priority, search_q } = req.query;
  let query = `SELECT id, todo, priority, status FROM todo WHERE 1=1`;

  if (status) query += ` AND status = '${status}'`;
  if (priority) query += ` AND priority = '${priority}'`;
  if (search_q) query += ` AND todo LIKE '%${search_q}%'`;

  const todos = await db.all(query);
  res.json(todos);
});

// Get a specific todo by ID
app.get("/todos/:todoId/", async (req, res) => {
  const { todoId } = req.params;
  const query = `SELECT id, todo, priority, status FROM todo WHERE id = ?;`;
  const todo = await db.get(query, [todoId]);
  res.json(todo);
});

// Create a new todo
app.post("/todos/", async (req, res) => {
  const { id, todo, priority, status } = req.body;
  const query = `INSERT INTO todo (id, todo, priority, status) VALUES (?, ?, ?, ?);`;
  await db.run(query, [id, todo, priority, status]);
  res.send("To do Successfully Added");
});

// Update a todo
app.put("/todos/:todoId/", async (req, res) => {
  const { todoId } = req.params;
  const { status, priority, todo } = req.body;

  let updateField = "";
  if (status) updateField = `status = '${status}'`;
  if (priority) updateField = `priority = '${priority}'`;
  if (todo) updateField = `todo = '${todo}'`;

  const query = `UPDATE todo SET ${updateField} WHERE id = ?;`;
  await db.run(query, [todoId]);

  if (status) return res.send("Status Updated");
  if (priority) return res.send("Priority Updated");
  if (todo) return res.send("Todo Updated");
});

// Delete a todo
app.delete("/todos/:todoId/", async (req, res) => {
  const { todoId } = req.params;
  const query = `DELETE FROM todo WHERE id = ?;`;
  await db.run(query, [todoId]);
  res.send("Todo Deleted");
});
