"use strict";

require("dotenv").config();
let express = require("express");
let app = express();
let port = process.env.PORT || 3001;
let router = require("./apis");

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get("/", (req, res) => {
  res.send("<h1>HELLO WORLD, WELCOME TO THE GM MIDDLEWARE.</h1>");
});

app.use("/", router);

app.listen(port, () => {
  console.log(`listening to port ${port}`);
});
