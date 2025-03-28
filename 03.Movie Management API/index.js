const express = require("express");
const app = express();

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");

app.use(express.json());

const dbPath = path.join(__dirname, "moviesData.db");
let db = null;
const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server running at http://localhost:3000/");
    });
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

// Get all movie names
app.get("/movies/", async (req, res) => {
  const moviesQuery = `SELECT movie_name AS movieName FROM movie;`;
  const moviesList = await db.all(moviesQuery);
  res.send(moviesList);
});

// Add a new movie
app.post("/movies/", async (req, res) => {
  const { director_id, movie_name, lead_actor } = req.body;
  const addMovieQuery = `
    INSERT INTO movie (director_id, movie_name, lead_actor)
    VALUES (?, ?, ?);`;
  await db.run(addMovieQuery, [director_id, movie_name, lead_actor]);
  res.send("Movie Successfully Added");
});

// Get a specific movie by ID
app.get("/movies/:movieId/", async (req, res) => {
  const { movieId } = req.params;
  const getMovieQuery = `
    SELECT movie_id, director_id, movie_name, lead_actor
    FROM movie WHERE movie_id = ?;`;
  const movie = await db.get(getMovieQuery, [movieId]);
  res.send(movie);
});

// Update a movie by ID
app.put("/movies/:movieId/", async (req, res) => {
  const { movieId } = req.params;
  const { director_id, movie_name, lead_actor } = req.body;
  const updateMovieQuery = `
    UPDATE movie 
    SET director_id = ?, movie_name = ?, lead_actor = ? 
    WHERE movie_id = ?;`;
  await db.run(updateMovieQuery, [
    director_id,
    movie_name,
    lead_actor,
    movieId,
  ]);
  res.send("Movie Details Updated");
});

// Delete a movie by ID
app.delete("/movies/:movieId/", async (req, res) => {
  const { movieId } = req.params;
  const deleteMovieQuery = `DELETE FROM movie WHERE movie_id = ?;`;
  await db.run(deleteMovieQuery, [movieId]);
  res.send("Movie Removed");
});

// Get all directors
app.get("/directors/", async (req, res) => {
  const directorsQuery = `SELECT director_id, director_name FROM director;`;
  const directorsList = await db.all(directorsQuery);
  res.send(directorsList);
});

// Get movies by a specific director
app.get("/directors/:directorId/movies/", async (req, res) => {
  const { directorId } = req.params;
  const getMoviesByDirectorQuery = `
    SELECT movie_name AS movieName FROM movie WHERE director_id = ?;`;
  const moviesList = await db.all(getMoviesByDirectorQuery, [directorId]);
  res.send(moviesList);
});
