const express = require("express");
const app = express();

const { open } = require("sqlite");
const path = require("path");
const sqlite3 = require("sqlite3");

app.use(express.json());

const dbPath = path.join(__dirname, "cricketTeam.db");
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
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

// GET All Players
app.get("/players/", async (request, response) => {
  try {
    const getPlayersQuery = `SELECT * FROM cricket_team ORDER BY player_id;`;
    const playersArray = await db.all(getPlayersQuery);
    response.send(playersArray);
  } catch (error) {
    response.status(500).send({ error: "Internal Server Error" });
  }
});

// GET Player by ID
app.get("/players/:player_id/", async (request, response) => {
  try {
    const { player_id } = request.params;
    const getPlayerQuery = `SELECT * FROM cricket_team WHERE player_id = ?;`;
    const player = await db.get(getPlayerQuery, [player_id]);

    if (player) {
      response.send(player);
    } else {
      response.status(404).send({ error: "Player Not Found" });
    }
  } catch (error) {
    response.status(500).send({ error: "Internal Server Error" });
  }
});

// ADD a Player
app.post("/players/", async (request, response) => {
  try {
    const { player_name, jersey_number, role } = request.body;
    const addPlayerQuery = `
      INSERT INTO cricket_team (player_name, jersey_number, role)
      VALUES (?, ?, ?);`;
    const result = await db.run(addPlayerQuery, [
      player_name,
      jersey_number,
      role,
    ]);

    // Get the last inserted player_id
    const playerId = result.lastID;
    response.send({
      message: "Player Added Successfully",
      player_id: playerId,
    });
  } catch (error) {
    response.status(500).send({ error: "Internal Server Error" });
  }
});

// UPDATE Player Details
app.put("/players/:playerId/", async (request, response) => {
  try {
    const { playerId } = request.params;
    const { playerName, jerseyNumber, role } = request.body;

    const updatePlayerQuery = `
      UPDATE cricket_team
      SET player_name = ?, jersey_number = ?, role = ?
      WHERE player_id = ?;`;

    const result = await db.run(updatePlayerQuery, [
      playerName,
      jerseyNumber,
      role,
      playerId,
    ]);

    if (result.changes === 0) {
      response.status(404).send({ error: "Player Not Found" });
    } else {
      response.send("Player Details Updated");
    }
  } catch (error) {
    response.status(500).send({ error: "Internal Server Error" });
  }
});

// DELETE Player
app.delete("/players/:playerId/", async (request, response) => {
  try {
    const { playerId } = request.params;
    const deletePlayerQuery = `
      DELETE FROM cricket_team WHERE player_id = ?;`;

    const result = await db.run(deletePlayerQuery, [playerId]);

    if (result.changes === 0) {
      response.status(404).send({ error: "Player Not Found" });
    } else {
      response.send("Player Removed");
    }
  } catch (error) {
    response.status(500).send({ error: "Internal Server Error" });
  }
});
