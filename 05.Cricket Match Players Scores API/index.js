const express = require("express");
const app = express();

const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const path = require("path");

app.use(express.json());

const dbPath = path.join(__dirname, "cricketMatchDetails.db");
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
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};
initializeDbAndServer();

// Get all players
app.get("/players/", async (req, res) => {
  const query = `SELECT player_id AS playerId, player_name AS playerName FROM player_details;`;
  const players = await db.all(query);
  res.json(players);
});

// Get player by ID
app.get("/players/:playerId/", async (req, res) => {
  const { playerId } = req.params;
  const query = `SELECT player_id AS playerId, player_name AS playerName FROM player_details WHERE player_id = ?;`;
  const player = await db.get(query, [playerId]);
  res.json(player);
});

// Update player details
app.put("/players/:playerId/", async (req, res) => {
  const { playerId } = req.params;
  const { playerName } = req.body;
  const query = `UPDATE player_details SET player_name = ? WHERE player_id = ?;`;
  await db.run(query, [playerName, playerId]);
  res.send("Player details updated");
});

// Get match details by ID
app.get("/matches/:matchId/", async (req, res) => {
  const { matchId } = req.params;
  const query = `SELECT match_id AS matchId, match, year FROM match_details WHERE match_id = ?;`;
  const match = await db.get(query, [matchId]);
  res.json(match);
});

// Get matches of a player
app.get("/players/:playerId/matches", async (req, res) => {
  const { playerId } = req.params;
  const query = `
    SELECT match_details.match_id AS matchId, match_details.match, match_details.year 
    FROM match_details
    JOIN player_match_score ON match_details.match_id = player_match_score.match_id
    WHERE player_match_score.player_id = ?;`;
  const matches = await db.all(query, [playerId]);
  res.json(matches);
});

// Get players of a specific match
app.get("/matches/:matchId/players", async (req, res) => {
  const { matchId } = req.params;
  const query = `
    SELECT player_details.player_id AS playerId, player_details.player_name AS playerName 
    FROM player_details
    JOIN player_match_score ON player_details.player_id = player_match_score.player_id
    WHERE player_match_score.match_id = ?;`;
  const players = await db.all(query, [matchId]);
  res.json(players);
});

// Get player statistics (total score, fours, sixes)
app.get("/players/:playerId/playerScores", async (req, res) => {
  const { playerId } = req.params;
  const query = `
    SELECT 
      player_details.player_id AS playerId, 
      player_details.player_name AS playerName, 
      SUM(player_match_score.score) AS totalScore, 
      SUM(player_match_score.fours) AS totalFours, 
      SUM(player_match_score.sixes) AS totalSixes
    FROM player_details
    JOIN player_match_score ON player_details.player_id = player_match_score.player_id
    WHERE player_details.player_id = ?;`;
  const stats = await db.get(query, [playerId]);
  res.json(stats);
});
