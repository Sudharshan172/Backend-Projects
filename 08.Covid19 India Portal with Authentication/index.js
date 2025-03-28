const express = require("express");
const app = express();

const sqlite3 = require("sqlite3").verbose();

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
app.use(express.json());

const db = new sqlite3.Database("covid19IndiaPortal.db");
const SECRET_KEY = "secret_key";

// Middleware to authenticate JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(401).send("Invalid JWT Token");

  const token = authHeader.split(" ")[1];

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(401).send("Invalid JWT Token");
    req.user = user;
    next();
  });
};

// Login User
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  db.get(
    "SELECT * FROM user WHERE username = ?",
    [username],
    async (err, user) => {
      if (!user) {
        return res.status(400).send("Invalid user");
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(400).send("Invalid password");
      }

      const token = jwt.sign({ username: user.username }, SECRET_KEY, {
        expiresIn: "1h",
      });
      res.status(200).json({ jwtToken: token });
    }
  );
});

// Get all states
app.get("/states", authenticateToken, (req, res) => {
  db.all(
    "SELECT state_id AS stateId, state_name AS stateName, population FROM state",
    [],
    (err, states) => {
      if (err) return res.status(500).send("Error retrieving states");
      res.status(200).json(states);
    }
  );
});

// Get state by stateId
app.get("/states/:stateId", authenticateToken, (req, res) => {
  const { stateId } = req.params;

  db.get(
    "SELECT state_id AS stateId, state_name AS stateName, population FROM state WHERE state_id = ?",
    [stateId],
    (err, state) => {
      if (!state) return res.status(404).send("State not found");
      res.status(200).json(state);
    }
  );
});

// Add a new district
app.post("/districts", authenticateToken, (req, res) => {
  const { districtName, stateId, cases, cured, active, deaths } = req.body;

  db.run(
    "INSERT INTO district (district_name, state_id, cases, cured, active, deaths) VALUES (?, ?, ?, ?, ?, ?)",
    [districtName, stateId, cases, cured, active, deaths],
    (err) => {
      if (err) return res.status(500).send("Error adding district");
      res.status(200).send("District Successfully Added");
    }
  );
});

// Get district by districtId
app.get("/districts/:districtId", authenticateToken, (req, res) => {
  const { districtId } = req.params;

  db.get(
    "SELECT district_name AS districtName, state_id AS stateId, cases, cured, active, deaths FROM district WHERE district_id = ?",
    [districtId],
    (err, district) => {
      if (!district) return res.status(404).send("District not found");
      res.status(200).json(district);
    }
  );
});

// Delete district by districtId
app.delete("/districts/:districtId", authenticateToken, (req, res) => {
  const { districtId } = req.params;

  db.run(
    "DELETE FROM district WHERE district_id = ?",
    [districtId],
    function (err) {
      if (this.changes === 0) return res.status(404).send("District not found");
      res.status(200).send("District Removed");
    }
  );
});

// Update district details
app.put("/districts/:districtId", authenticateToken, (req, res) => {
  const { districtId } = req.params;
  const { districtName, stateId, cases, cured, active, deaths } = req.body;

  db.run(
    "UPDATE district SET district_name = ?, state_id = ?, cases = ?, cured = ?, active = ?, deaths = ? WHERE district_id = ?",
    [districtName, stateId, cases, cured, active, deaths, districtId],
    function (err) {
      if (this.changes === 0) return res.status(404).send("District not found");
      res.status(200).send("District Details Updated");
    }
  );
});

// Get state statistics
app.get("/states/:stateId/stats", authenticateToken, (req, res) => {
  const { stateId } = req.params;

  db.get(
    "SELECT SUM(cases) AS totalCases, SUM(cured) AS totalCured, SUM(active) AS totalActive, SUM(deaths) AS totalDeaths FROM district WHERE state_id = ?",
    [stateId],
    (err, stats) => {
      if (!stats) return res.status(404).send("State not found");
      res.status(200).json(stats);
    }
  );
});

// Start server
app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
