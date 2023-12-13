const express = require("express");
const app = express();
const bcrypt = require("bcrypt");
const cors = require("cors");
const { pool } = require("./dbConfig");

const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(
  cors({
    origin: "http://127.0.0.1:5173",
  })
);

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
app.post("/v1/book/shelve/:user_id", async (req, res) => {
  const userId = req.params.user_id;
  const { author, publicationYear, title, olid, pageCount, rating, shelfType } =
    req.body;

  const saveToUserBooksReadTable = (id, bookId, numRating, assignedShelf) => {
    pool.query(
      `
      INSERT INTO user_shelved_books (user_id, book_id, rating, shelf_type)
      VALUES ($1, $2, $3, $4)
      `,
      [id, bookId, numRating, assignedShelf],
      (junctErr, junctRes) => {
        if (junctErr) {
          console.log(junctErr);
          res
            .status(500)
            .send({ message: "Error Adding User-Book relationship" });
        }
        console.log(`new read book added for ${id}`);
        res.status(201).send({ message: "Book added to Read shelf" });
      }
    );
  };

  // temp fix for missing pageCounts (DB only takes integer type)
  const pageCountCheck = pageCount === "" ? 0 : pageCount;
  pool.query(
    `SELECT * FROM books
    WHERE olid = $1`,
    [olid],
    (findErr, findRes) => {
      if (findErr) {
        console.log(findErr);
        res.status(500).send({ message: "Error Finding book" });
      }

      let localBookId = "";
      if (findRes.rows.length < 1) {
        pool.query(
          `
          INSERT INTO books(author, publication_year, title, olid, page_count)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id`,
          [author, publicationYear, title, olid, pageCountCheck],
          (insertErr, insertRes) => {
            if (insertErr) {
              console.log(insertErr);
              res.status(500).send({ message: "Error Inserting book" });
            }
            console.log(`${title} by ${author} added into books table`);
            // TODO some issue when trying to save books that already exist in DB - check for duplicates and think about how to handle them
            localBookId = insertRes.rows[0].id;
            saveToUserBooksReadTable(userId, localBookId, rating, shelfType);
          }
        );
      } else {
        localBookId = findRes.rows[0].id;
        saveToUserBooksReadTable(userId, localBookId, rating, shelfType);
      }
    }
  );
});

app.get("/v1/book/read/:user_id", async (req, res) => {
  const id = req.params.user_id;

  pool.query(
    `SELECT id,title,author,publication_year,olid,page_count,rating,shelf_type FROM books INNER JOIN (SELECT book_id,rating,shelf_type FROM user_shelved_books WHERE user_id=$1) as urb ON books.id = urb.book_id`,
    [id],
    async (err, results) => {
      if (err) {
        res.status(500).send({ message: "Error retrieving read books." });
      }
      res.status(200).send(results ? results.rows : []);
    }
  );
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
