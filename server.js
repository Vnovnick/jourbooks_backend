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

  if (!username || !email || !password || !confirmPassword) {
    res.status(500).send({ message: "Please enter all fields" });
  } else if (password && password.length < 6) {
    res
      .status(500)
      .send({ message: "Password should be at least 6 characters" });
  } else if (password !== confirmPassword) {
    res.status(500).send({ message: "Password do not match" });
  } else {
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log(hashedPassword);
    res.status(201).send(JSON.stringify(req.body));
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
