const express = require("express");
const app = express();

const sqlite3 = require("sqlite3").verbose();
const { open } = require("sqlite");

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { format } = require("date-fns");

app.use(express.json());

const dbPath = "twitterClone.db";
let db = null;
const initializeDBAndServer = async () => {
  try {
    db = await open({ filename: dbPath, driver: sqlite3.Database });
    app.listen(3000, () =>
      console.log("Server running at http://localhost:3000/")
    );
  } catch (error) {
    console.error(`DB Error: ${error.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

// Middleware for JWT Authentication
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(401).send("Invalid JWT Token");

  const token = authHeader.split(" ")[1];
  jwt.verify(token, "SECRET_KEY", (error, payload) => {
    if (error) return res.status(401).send("Invalid JWT Token");
    req.userId = payload.userId;
    next();
  });
};

// Register User
app.post("/register/", async (req, res) => {
  const { username, password, name, gender } = req.body;
  const userExists = await db.get("SELECT * FROM user WHERE username = ?", [
    username,
  ]);

  if (userExists) return res.status(400).send("User already exists");
  if (password.length < 6) return res.status(400).send("Password is too short");

  const hashedPassword = await bcrypt.hash(password, 10);
  await db.run(
    "INSERT INTO user (username, password, name, gender) VALUES (?, ?, ?, ?)",
    [username, hashedPassword, name, gender]
  );

  res.send("User created successfully");
});

// User Login
app.post("/login/", async (req, res) => {
  const { username, password } = req.body;
  const user = await db.get("SELECT * FROM user WHERE username = ?", [
    username,
  ]);

  if (!user) return res.status(400).send("Invalid user");
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) return res.status(400).send("Invalid password");

  const token = jwt.sign({ userId: user.user_id }, "SECRET_KEY");
  res.send({ jwtToken: token });
});

// Get User's Following Tweets (Latest 4 Tweets)
app.get("/user/tweets/feed/", authenticateToken, async (req, res) => {
  const query = `
    SELECT username, tweet, date_time AS dateTime
    FROM tweet 
    JOIN user ON tweet.user_id = user.user_id
    WHERE tweet.user_id IN (
      SELECT following_user_id FROM follower WHERE follower_user_id = ?
    )
    ORDER BY date_time DESC LIMIT 4;
  `;
  const tweets = await db.all(query, [req.userId]);
  res.send(tweets);
});

// Get Following Users
app.get("/user/following/", authenticateToken, async (req, res) => {
  const query = `
    SELECT name FROM user
    WHERE user_id IN (SELECT following_user_id FROM follower WHERE follower_user_id = ?);
  `;
  const following = await db.all(query, [req.userId]);
  res.send(following);
});

// Get Followers
app.get("/user/followers/", authenticateToken, async (req, res) => {
  const query = `
    SELECT name FROM user
    WHERE user_id IN (SELECT follower_user_id FROM follower WHERE following_user_id = ?);
  `;
  const followers = await db.all(query, [req.userId]);
  res.send(followers);
});

// Get Tweet Details (Only if Following)
app.get("/tweets/:tweetId/", authenticateToken, async (req, res) => {
  const { tweetId } = req.params;
  const isFollowing = await db.get(
    `
    SELECT 1 FROM tweet
    WHERE tweet_id = ? AND user_id IN (
      SELECT following_user_id FROM follower WHERE follower_user_id = ?
    )`,
    [tweetId, req.userId]
  );

  if (!isFollowing) return res.status(401).send("Invalid Request");

  const tweetDetails = await db.get(
    `
    SELECT tweet, 
           (SELECT COUNT(*) FROM like WHERE tweet_id = ?) AS likes,
           (SELECT COUNT(*) FROM reply WHERE tweet_id = ?) AS replies,
           date_time AS dateTime
    FROM tweet WHERE tweet_id = ?`,
    [tweetId, tweetId, tweetId]
  );

  res.send(tweetDetails);
});

// Get Likes on Tweet
app.get("/tweets/:tweetId/likes/", authenticateToken, async (req, res) => {
  const { tweetId } = req.params;
  const isFollowing = await db.get(
    `
    SELECT 1 FROM tweet
    WHERE tweet_id = ? AND user_id IN (
      SELECT following_user_id FROM follower WHERE follower_user_id = ?
    )`,
    [tweetId, req.userId]
  );

  if (!isFollowing) return res.status(401).send("Invalid Request");

  const likes = await db.all(
    "SELECT username FROM user JOIN like ON user.user_id = like.user_id WHERE tweet_id = ?",
    [tweetId]
  );
  res.send({ likes: likes.map((like) => like.username) });
});

// Get Replies on Tweet
app.get("/tweets/:tweetId/replies/", authenticateToken, async (req, res) => {
  const { tweetId } = req.params;
  const isFollowing = await db.get(
    `
    SELECT 1 FROM tweet
    WHERE tweet_id = ? AND user_id IN (
      SELECT following_user_id FROM follower WHERE follower_user_id = ?
    )`,
    [tweetId, req.userId]
  );

  if (!isFollowing) return res.status(401).send("Invalid Request");

  const replies = await db.all(
    `
    SELECT name, reply FROM reply
    JOIN user ON reply.user_id = user.user_id
    WHERE tweet_id = ?`,
    [tweetId]
  );

  res.send({ replies });
});

// Post a Tweet
app.post("/user/tweets/", authenticateToken, async (req, res) => {
  const { tweet } = req.body;
  const dateTime = format(new Date(), "yyyy-MM-dd HH:mm:ss");
  await db.run(
    "INSERT INTO tweet (tweet, user_id, date_time) VALUES (?, ?, ?)",
    [tweet, req.userId, dateTime]
  );
  res.send("Created a Tweet");
});

// Delete a Tweet
app.delete("/tweets/:tweetId/", authenticateToken, async (req, res) => {
  const { tweetId } = req.params;
  const tweet = await db.get("SELECT * FROM tweet WHERE tweet_id = ?", [
    tweetId,
  ]);

  if (!tweet || tweet.user_id !== req.userId)
    return res.status(401).send("Invalid Request");

  await db.run("DELETE FROM tweet WHERE tweet_id = ?", [tweetId]);
  res.send("Tweet Removed");
});
