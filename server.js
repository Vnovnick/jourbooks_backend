const express = require("express");
const app = express();
const bcrypt = require("bcrypt");
const { pool } = require("./dbConfig");

const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: false }));

app.get("/", (req, res) => {
  res.send({ message: "yes" });
});

app.post("/", (req, res) => {
  // const { username, email, password, confirmPassword } = req.body;
  console.log(req.body);
  // console.log({ username, email, password, confirmPassword });
  //   res.send({ username, email, password, confirmPassword })

  if (!username || !email || !password || !confirmPassword) {
    res.status(500).send({ message: "Please enter all fields" });
  } else if (password && password.length < 6) {
    res
      .status(500)
      .send({ message: "Password should be at least 6 characters" });
  } else if (password !== confirmPassword) {
    res.status(500).send({ message: "Password do not match" });
  } else {
    const hashedPassword = bcrypt.hash(password, 10);
    console.log(hashedPassword);
    res.status(201).send({ message: "Success" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
