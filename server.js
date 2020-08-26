require("dotenv").config();
let express = require("express");
let app = express();
let port = process.env.PORT || 3000;
const { google } = require("googleapis");
let { GoogleSpreadsheet } = require("google-spreadsheet");
let credentials = require("./credentials");
const sheets = google.sheets("v4");

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get("/", (req, res) => {
  res.send("<h1>HELLO JEREMY</h1>");
});

app.post("/append-order-number", async (req, res) => {
  let { orderNumber } = req.body;
  let { username, password, ss_id} = process.env;
  console.log(req.headers.authorization);
  //basicauth = <base64 encrypted version of `Basic <username>:<password>`>
  let basicauth = Buffer.from(req.headers.authorization.slice(6), 'base64').toString('binary');
  // basicauth = "jeremy:andrews"
  basicauth = basicauth.split(":");
  console.log(basicauth);
  if(username != basicauth[0] || password != basicauth[1]) {
    console.log(username, basicauth[0], "    ", password, basicauth[1])
    res.status(401).send({message: "Unauthorized!"})
  }

  if (!orderNumber) {
    orderNumber = "XSFJQ2";
    // res.status(404).send({message: "No order number was sent."})
  }
  var doc = new GoogleSpreadsheet();
  await doc.useServiceAccountAuth(credentials);
  const auth = new google.auth.OAuth2();
  auth.setCredentials(doc.jwtClient.credentials);
  console.log("AUTH1: ", auth);
  let r = await sheets.spreadsheets.values.get({
    auth,
    spreadsheetId: ss_id,
    range: "A1:B"
  });

  console.log(r);
  r = r.data.values;
  let edited;
  for (let i = 0; i < r.length; i++) {
    let n = r[i][0];
    let x = r[i][1];
    if (n == orderNumber) {
      r[i][1] += r[i][0];
      edited = i;
      break;
    } else if (i == r.length - 1) {
      res.status(404).send({ message: "Order number does not exist." });
    }
  }

  let body = {
    values: r
  };
  res.send(r);
  // sheets.spreadsheets.values.update(
  //   {
  //     auth,
  //     spreadsheetId: ss_id,
  //     range: "A1:B",
  //     valueInputOption: "USER_ENTERED",
  //     resource: body
  //   },
  //   (err, response) => {
  //     if(err) {
  //       console.log(err)
  //       res.status(500);
  //     }
  //     var result = response.result;
  //     console.log(result);
  //     console.log(`${result.updatedCells} cells updated.`);
  //     res.send({ updated: result.updatedCells });
  //   }
  // );

});

app.listen(port, () => {
  console.log(`listening to port ${port}`);
});
