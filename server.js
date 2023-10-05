const express = require("express");
const app = express();
const bcrypt = require("bcrypt");
const { pool } = require("./dbConfig");

const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.get("/", (req, res) => {
  res.send({ message: "yes" });
});

app.post("/", async (req, res) => {
  const { username, email, password, confirmPassword } = req.body;

  // commenting out validation since its handled in the svelte action
  // if (!username || !email || !password || !confirmPassword) {
  //   res.status(500).send({ message: "Please enter all fields" });
  // } else if (password && password.length < 6) {
  //   res
  //     .status(500)
  //     .send({ message: "Password should be at least 6 characters" });
  // } else if (password !== confirmPassword) {
  //   res.status(500).send({ message: "Password do not match" });
  // } else {
  const hashedPassword = await bcrypt.hash(password, 10);

  pool.query(
    `SELECT * FROM users
      WHERE email = $1`,
    [email],
    (err, results) => {
      if (err) {
        throw err;
      }

      if (results.rows.length > 0) {
        res.status(500).send({ message: "Email already registered" });
      } else {
        pool.query(
          `INSERT INTO users (username, email, password)
            VALUES ($1, $2, $3)
            RETURNING id, password`,
          [username, email, hashedPassword],
          (err, results) => {
            if (err) {
              throw err;
            }
            console.log(results.rows);
            console.log("new user registered");
            res.status(201).send({ message: "User Successfully created" });
          }
        );
      }
    }
  );
  // }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
