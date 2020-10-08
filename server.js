"use strict";

require("dotenv").config();
let express = require("express");
let app = express();
let port = process.env.PORT || 3001;
const { google } = require("googleapis");
let { GoogleSpreadsheet } = require("google-spreadsheet");
// let credentials = require("./credentials");
const sheets = google.sheets("v4");

const credsFromEnv = {
  type: process.env.type,
  project_id: process.env.project_id,
  private_key_id: process.env.private_key_id,
  private_key: process.env.private_key.split("\\n").join("\n"),
  client_email: process.env.client_email,
  client_id: process.env.client_id,
  auth_uri: process.env.auth_uri,
  token_uri: process.env.token_uri,
  auth_provider_x509_cert_url: process.env.auth_provider_x509_cert_url,
  client_x509_cert_url: process.env.client_x509_cert_url
};
let credentials = credsFromEnv;
if (process.env.ENV == "dev") {
  credentials = require("./credentials");
}

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get("/", (req, res) => {
  res.send("<h1>HELLO JEREMY</h1>");
});

app.post("/append-order-number", async (req, res) => {
  let { orderNumber, phoneNumber } = req.body;
  let { username, password, ss_id } = process.env;
  console.log("ORDER NUMBER: ", orderNumber,)
  console.log("PHONE NUMBER: ", phoneNumber)
  // console.log(req.headers.authorization);
  //basicauth = <base64 encrypted version of `Basic <username>:<password>`>
  let basicauth = Buffer.from(
    req.headers.authorization.slice(6),
    "base64"
  ).toString("binary");
  basicauth = basicauth.split(":");
  // console.log(basicauth);
  if (username != basicauth[0] || password != basicauth[1]) {
    // console.log(username, basicauth[0], "    ", password, basicauth[1]);
    res.status(401).send({ message: "Unauthorized!" });
  }

  if (!orderNumber) {
    // orderNumber = "XSFJQ2";
    res.status(404).send({ message: "No order number was sent." });
  }
  if (!phoneNumber) {
    res.status(404).send({ message: "No phone number was sent." });
  }

  var doc = new GoogleSpreadsheet();
  await doc.useServiceAccountAuth(credentials);
  const auth = new google.auth.OAuth2();
  auth.setCredentials(doc.jwtClient.credentials);
  console.log("AUTH1: ", auth);
  let r = await sheets.spreadsheets.values.get({
    auth,
    spreadsheetId: ss_id,
    range: "A1:F"
  });

  console.log(r);
  r = r.data.values;
  let edited;
  let returnMsg;
  for (let i = 0; i < r.length; i++) {
    let order = r[i][0];
    let o = r[i][1];
    let n = r[i][2];
    if (order.toUpperCase() == orderNumber) {
      if (o != phoneNumber && n != phoneNumber) {
        r[i][2] = phoneNumber;
        edited = i;
        returnMsg = r[i][5].replace("<XXXXXX>", order);
        console.log("RETURN MSG: ", returnMsg)
        break;
      } else {
        if (n == phoneNumber) {
          res.send({
            message:
              "New number was previously edited and is the same as the currently requested."
          });
        } else {
          res.send({ message: "Phone number is the same." });
        }
      }
    } else if (i == r.length - 1) {
      res.send({ message: "Order number does not exist." });
    }
  }

  let body = {
    values: r
  };
  try {
    sheets.spreadsheets.values.update(
      {
        auth,
        spreadsheetId: ss_id,
        range: "A1:F",
        valueInputOption: "USER_ENTERED",
        resource: body
      },
      (err, response) => {
        if (err) {
          console.log(err);
          res.status(500);
        }
        // var result = response.result;
        console.log(response);
        console.log(`${response.data.updatedRange} cells updated.`);
        //`Phone number was revised to "${phoneNumber}" on order number ${orderNumber}.`
        res.send({ message: returnMsg, updated: response.config.data.values });
      }
    );
  } catch (e) {
    console.log(e);
    res.send({ message: "error with updating sheet" });
  }
});

app.listen(port, () => {
  console.log(`listening to port ${port}`);
});
