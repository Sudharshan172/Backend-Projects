const express = require("express");
const app = express();

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");

app.use(express.json());

const dbPath = path.join(__dirname, "covid19India.db");
let db = null;
const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (error) {
    console.error(`DB Error: ${error.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

// Get all States
app.get("/states/", async (request, response) => {
  const getStatesQuery = `SELECT * FROM state ORDER BY state_id;`;
  const states = await db.all(getStatesQuery);
  response.send(states);
});

// Get a specific State by ID
app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const getStateQuery = `SELECT * FROM state WHERE state_id = ?;`;
  const state = await db.get(getStateQuery, [stateId]);

  if (state) {
    response.send(state);
  } else {
    response.status(404).send({ error: "State Not Found" });
  }
});

// Add a District
app.post("/districts/", async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const addDistrictQuery = `
    INSERT INTO district (district_name, state_id, cases, cured, active, deaths)
    VALUES (?, ?, ?, ?, ?, ?);`;

  const result = await db.run(addDistrictQuery, [
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  ]);

  response.send({
    message: "District Added Successfully",
    districtId: result.lastID,
  });
});

// Get a District by ID
app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictQuery = `SELECT * FROM district WHERE district_id = ?;`;
  const district = await db.get(getDistrictQuery, [districtId]);

  if (district) {
    response.send(district);
  } else {
    response.status(404).send({ error: "District Not Found" });
  }
});

// Delete a District by ID
app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const deleteDistrictQuery = `DELETE FROM district WHERE district_id = ?;`;

  await db.run(deleteDistrictQuery, [districtId]);
  response.send("District Removed");
});

// Update a District by ID
app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const { districtName, stateId, cases, cured, active, deaths } = request.body;

  const updateDistrictQuery = `
    UPDATE district
    SET district_name = ?, state_id = ?, cases = ?, cured = ?, active = ?, deaths = ?
    WHERE district_id = ?;
  `;

  await db.run(updateDistrictQuery, [
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
    districtId,
  ]);

  response.send("District Details Updated");
});

// Get State Statistics based on State ID
app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const stateStatsQuery = `
    SELECT SUM(cases) AS totalCases, SUM(cured) AS totalCured,
           SUM(active) AS totalActive, SUM(deaths) AS totalDeaths
    FROM district WHERE state_id = ?;
  `;

  const stats = await db.get(stateStatsQuery, [stateId]);
  response.send(stats);
});
