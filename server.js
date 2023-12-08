const express = require("express");
const app = express();
const bcrypt = require("bcrypt");
const { pool } = require("./dbConfig");

const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// user endpoints
app.get("/v1/user/:id", async (req, res) => {
  const id = req.params.id;

  pool.query(
    `SELECT * FROM users
    WHERE id = $1`,
    [id],
    (err, results) => {
      if (err) {
        throw err;
      }

      if (results.rows.length === 0) {
        res
          .status(400)
          .send({ message: "An account with this email does not exist." });
      } else {
        const retrievedUser = results.rows[0];
        res.send(retrievedUser);
      }
    }
  );
});

// check if user exists on login
app.post("/v1/login", async (req, res) => {
  const { email, password } = req.body;

  pool.query(
    `SELECT * FROM users
      WHERE email = $1`,
    [email],
    (err, results) => {
      if (err) {
        res
          .status(400)
          .send({ message: "An account with this email does not exist." });
      }

      const retrievedUser = results.rows[0];
      if (bcrypt.compare(password, retrievedUser.password)) {
        // for some reason, sending status crashes and gives "cannot set headers after they are sent to client" error
        res.send(retrievedUser);
      } else {
        res.status(401).send({ message: "Incorrect Password" });
      }
    }
  );
});

// add new user
app.post("/v1/register", async (req, res) => {
  const { username, email, password } = req.body;
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
        res
          .status(500)
          .send({ message: "An account with this email already exists." });
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

// book endpoints
app.post("v1/book/shelve_read/:user_id", async (req, res) => {
  // expect request to contain userid, book info (olid, title, author, page count, publication year), and rating
  const userId = req.params.user_id;
  const { author, publicationYear, title, olid, pageCount, rating } = req.body;

  pool.query(
    `SELECT * FROM books
    WHERE olid = $1`,
    [olid],
    (findErr, findRes) => {
      if (findErr) {
        res.status(500).send({ message: "Error Finding book" });
      }

      let localBookId = "";
      if (findRes.rows.length === 0) {
        pool.query(
          `
          INSERT INTO books(author, publication_year, title, olid, page_count)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id`,
          [author, publicationYear, title, olid, pageCount],
          (insertErr, insertRes) => {
            if (insertErr) {
              res.status(500).send({ message: "Error Inserting book" });
            }
            console.log("book results after insertion", insertRes.rows);
            console.log("new book added");
            localBookId = insertRes.rows[0].id;
          }
        );
      } else {
        localBookId = findRes.rows[0].id;
      }

      pool.query(
        `
        INSERT INTO user_books_read (user_id, book_id, rating)
        VALUES ($1, $2, $3)
        `,
        [userId, localBookId, rating],
        (junctErr, junctRes) => {
          if (junctErr) {
            res
              .status(500)
              .send({ message: "Error Adding User-Book relationship" });
          }
          console.log(junctRes.rows);
          console.log(`new read book added for ${userId}`);
          res.status(201).send({ message: "Book added to Read shelf" });
        }
      );
    }
  );
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
