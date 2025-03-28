const express = require("express");
const app = express();

const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

app.use(express.json());

const db = new sqlite3.Database("userData.db");

app.post("/register", async (req, res) => {
  const { username, name, password, gender, location } = req.body;

  if (password.length < 5) {
    return res.status(400).send("Password is too short");
  }

  db.get(
    "SELECT * FROM user WHERE username = ?",
    [username],
    async (err, user) => {
      if (user) {
        return res.status(400).send("User already exists");
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      db.run(
        "INSERT INTO user (username, name, password, gender, location) VALUES (?, ?, ?, ?, ?)",
        [username, name, hashedPassword, gender, location],
        (err) => {
          if (err) {
            return res.status(500).send("Error registering user");
          }
          res.status(200).send("User created successfully");
        }
      );
    }
  );
});

// Login user
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

      const token = jwt.sign({ username: user.username }, "secret_key", {
        expiresIn: "1h",
      });
      res.status(200).json({ message: "Login success!", token });
    }
  );
});

// Change password
app.put("/change-password", async (req, res) => {
  const { username, oldPassword, newPassword } = req.body;

  if (newPassword.length < 5) {
    return res.status(400).send("Password is too short");
  }

  db.get(
    "SELECT * FROM user WHERE username = ?",
    [username],
    async (err, user) => {
      if (!user) {
        return res.status(400).send("Invalid user");
      }

      const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
      if (!isPasswordValid) {
        return res.status(400).send("Invalid current password");
      }

      const hashedNewPassword = await bcrypt.hash(newPassword, 10);

      db.run(
        "UPDATE user SET password = ? WHERE username = ?",
        [hashedNewPassword, username],
        (err) => {
          if (err) {
            return res.status(500).send("Error updating password");
          }
          res.status(200).send("Password updated");
        }
      );
    }
  );
});

// Start server
app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
