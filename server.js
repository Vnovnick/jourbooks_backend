const express = require("express");
const app = express();
const bcrypt = require("bcrypt");
const cors = require("cors");
const { pool } = require("./dbConfig");
const dayjs = require("dayjs");

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
  const {
    author,
    publicationYear,
    title,
    olid,
    pageCount,
    rating,
    shelfType,
    coverKey,
  } = req.body;

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
          INSERT INTO books(author, publication_year, title, olid, page_count, cover_key)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id`,
          [author, publicationYear, title, olid, pageCountCheck, coverKey],
          (insertErr, insertRes) => {
            if (insertErr) {
              console.log(insertErr);
              res.status(500).send({ message: "Error Inserting book" });
            }
            console.log(`${title} by ${author} added into books table`);
            // TODO some issue when trying to save books that already exist in DB - check for duplicates and think about how to handle them
            localBookId = insertRes.rows[0].id;
            saveToUserBooksReadTable(
              userId,
              localBookId,
              rating,
              shelfType,
              coverKey
            );
          }
        );
      } else {
        localBookId = findRes.rows[0].id;
        saveToUserBooksReadTable(
          userId,
          localBookId,
          rating,
          shelfType,
          coverKey
        );
      }
    }
  );
});

app.get("/v1/book/shelved/all/:user_id", async (req, res) => {
  const id = req.params.user_id;

  pool.query(
    `SELECT id,title,author,publication_year,olid,page_count,cover_key,rating,shelf_type FROM books INNER JOIN (SELECT book_id,rating,shelf_type FROM user_shelved_books WHERE user_id=$1) as urb ON books.id = urb.book_id`,
    [id],
    async (err, results) => {
      if (err) {
        res.status(500).send({ message: "Error retrieving shelved books." });
      }
      res.status(200).send(results ? results.rows : []);
    }
  );
});

app.get("/v1/book/shelved/:user_book_id", async (req, res) => {
  const [bookId, userId] = req.params.user_book_id.split(":");

  pool.query(
    `SELECT id,title,author,publication_year,olid,page_count,cover_key,rating,shelf_type,review_id FROM books INNER JOIN (SELECT book_id,rating,shelf_type,review_id FROM user_shelved_books WHERE user_id=$1 AND book_id=$2) as urb ON books.id = urb.book_id`,
    [userId, bookId],
    async (err, results) => {
      if (err) {
        res.status(500).send({ message: "Error retrieving book data." });
      }
      if (results.length === 0) {
        res.status(404).send({ message: "No books found with matching id." });
      } else {
        const bookData = results.rows[0];
        pool.query(
          `
          SELECT * FROM reviews 
          WHERE id = $1
          `,
          [bookData.review_id],
          (revErr, revRes) => {
            if (revErr) {
              res
                .status(500)
                .send({ message: "Error retrieving matching review." });
            } else {
              const revData = revRes.rows[0];
              delete bookData.review_id;
              bookData.review = revData;
              res.status(200).send(bookData);
            }
          }
        );
      }
    }
  );
});

// book - journal entries

// add new journal entry
app.post("/v1/book/shelved/journal/:book_id", async (req, res) => {
  const bookId = req.params.book_id;
  const { text, title, userId } = req.body;
  const currentDate = dayjs().valueOf();

  pool.query(
    `
    INSERT INTO book_journal_entries (text, title, created_at)
    VALUES ($1, $2, $3)
    RETURNING id
    `,
    [text, title, currentDate],
    (postErr, postRes) => {
      if (postErr) {
        console.log(postErr);
        res.status(500).send({ message: "Error saving journal entry." });
      } else {
        console.log(`new journal entry added`);
        pool.query(
          `
          UPDATE user_shelved_books SET entry_ids = array_append(entry_ids, $1) 
          WHERE user_id=$2 AND book_id=$3
          `,
          [postRes.rows[0].id, userId, bookId],
          (updateErr, updateRes) => {
            if (updateErr) {
              console.log(updateErr);
              res.status(500).send({
                message: "Error updating joint table with new entry id.",
              });
            }
            console.log("new post created and linekd to user's shelved books.");
            res
              .status(201)
              .send({ message: "New journal entry successfully saved." });
          }
        );
      }
    }
  );
});

// get all journal entries for a given book
app.get("/v1/book/shelved/journal/:book_user_ids", async (req, res) => {
  const [bookId, userId] = req.params.book_user_ids.split(":");

  pool.query(
    `SELECT entry_ids FROM user_shelved_books WHERE user_id=$1 AND book_id=$2`,
    [userId, bookId],
    async (err, results) => {
      if (err) {
        res.status(500).send({ message: "Error retrieving entry ids" });
      } else {
        if (!results.rows[0].entry_ids) {
          res.status(200).send([]);
        } else {
          const ids = results.rows[0].entry_ids;
          const convertedIds = JSON.stringify(ids)
            .replace("[", "{")
            .replace("]", "}");
          pool.query(
            `SELECT * FROM book_journal_entries WHERE id = ANY ($1)`,
            [convertedIds],
            (postsErr, postsResults) => {
              if (postsErr) {
                res
                  .status(500)
                  .send({ message: "Error retrieving matching posts" });
              } else {
                res.status(200).send(postsResults ? postsResults.rows : []);
              }
            }
          );
        }
      }
    }
  );
});

// delete specific journal entry
app.delete("/v1/book/shelved/journal/:book_user_post_ids", async (req, res) => {
  const [bookId, userId, postId] = req.params.book_user_post_ids.split(":");

  pool.query(
    `
    UPDATE user_shelved_books
    SET entry_ids = array_remove(entry_ids, $1)
    WHERE user_id = $2 AND book_id = $3
  `,
    [postId, userId, bookId],
    (updateErr, updateRes) => {
      if (updateErr) {
        res.status(500).send({ message: "Error update user_shelved_books" });
      } else {
        pool.query(
          `
          DELETE FROM book_journal_entries
          WHERE id = $1
          `,
          [postId],
          (delErr, delRes) => {
            if (delErr) {
              res.status(500).send({ message: "Error deleting post" });
            } else {
              res.status(200).send({ message: "Post successfully deleted" });
            }
          }
        );
      }
    }
  );
});

// patch specific journal entry
app.patch("/v1/book/shelved/journal/:post_id", async (req, res) => {
  const postId = req.params.post_id;
  const { title, text } = req.body;
  const editedAt = dayjs().valueOf();

  pool.query(
    `
    UPDATE book_journal_entries
    SET title = $1, text = $2, edited_at = $3
    WHERE id = $4
    `,
    [title, text, editedAt, postId],
    (updateErr, updateRes) => {
      if (updateErr) {
        res.status(500).send({ message: "Error patching journal entry" });
      } else {
        res.status(200).send({ message: "Succesfully patched journal entry!" });
      }
    }
  );
});

// book - reviews

// post review
app.post("/v1/book/shelved/review/:book_id", async (req, res) => {
  const bookId = req.params.book_id;
  const { text, title, userId } = req.body;
  const currentDate = dayjs().valueOf();

  pool.query(
    `
    INSERT INTO reviews (title, text, created_at)
    VALUES ($1, $2, $3)
    RETURNING id
    `,
    [title, text, currentDate],
    (insertErr, insertRes) => {
      if (insertErr) {
        console.log(insertErr);
        res.status(500).send({ message: "Error saving review." });
      } else {
        pool.query(
          `
          UPDATE user_shelved_books SET review_id = $1
          WHERE user_id = $2 AND book_id = $3
          `,
          [insertRes.rows[0].id, userId, bookId],
          (updateErr, updateRes) => {
            if (updateErr) {
              console.log(updateErr);
              res
                .status(500)
                .send({ message: "Error linking review to shelved book." });
            } else {
              console.log("Review saved");
              res.status(201).send({ message: "Review successfully saved." });
            }
          }
        );
      }
    }
  );
});

// TODO test and add to frontend
// patch review
app.patch("/v1/book/shelved/review/:review_id", async (req, res) => {
  const reviewId = req.params.review_id;
  const { title, text } = req.body;
  const editedAt = dayjs().valueOf();

  pool.query(
    `
    UPDATE reviews
    SET title = $1, text = $2, edited_at = $3
    WHERE id = $4
    `,
    [title, text, editedAt, reviewId],
    (updateErr, updateRes) => {
      if (updateErr) {
        console.log(updateErr);
        res.status(500).send({ message: "Error updating review" });
      } else {
        res.status(200).send({ message: "Review patched successfully" });
      }
    }
  );
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
