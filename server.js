require("dotenv").config();
let express = require("express");
let app = express();
let port = process.env.PORT || 3000;
const { google } = require("googleapis");
let { GoogleSpreadsheet } = require("google-spreadsheet");
let credentials = require("./credentials");
const sheets = google.sheets("v4");

app.use(express.json());
app.use(express.urlencoded({extended: false}));

app.get('/', (req, res) => {
    res.send("<h1>HELLO JEREMY</h1>")
})

app.get('/getDataValues', async (req, res) => {
    var doc = new GoogleSpreadsheet();
  await doc.useServiceAccountAuth(credentials);
  const auth = new google.auth.OAuth2();
  auth.setCredentials(doc.jwtClient.credentials);
  console.log("AUTH1: ", auth);
  sheets.spreadsheets.values.get({
      auth,
      spreadsheetId: process.env.ss_id,
      range: "A1:G"
  },
  (err, response) => {
      if(err) {
          console.log(err)
          return res.status(400).json(err.data);
      }
      res.send(response);
  })
})

app.listen(port, () => {
    console.log(`listening to port ${port}`)
})