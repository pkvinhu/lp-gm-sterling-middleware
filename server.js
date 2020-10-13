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
  if (username != basicauth[0] || password != basicauth[1]) {
    res.send({ message: "Unauthorized!" });
  }

  // if (!orderNumber) {
  //   // orderNumber = "XSFJQ2";
  //   res.send({ message: "No order number was sent." });
  // }

  /* IF NO NUMBER WAS SENT */
  if (!phoneNumber) {
    res.send({ message: "No phone number was sent." });
  }

  /* GET SHEET DATA VALUES FOR PARSING */
  var doc = new GoogleSpreadsheet();
  await doc.useServiceAccountAuth(credentials);
  const auth = new google.auth.OAuth2();
  auth.setCredentials(doc.jwtClient.credentials);
  console.log("AUTH1: ", auth);
  let r = await sheets.spreadsheets.values.get({
    auth,
    spreadsheetId: ss_id,
    range: "'OptIn'!A1:F"
  });

  console.log(r);
  r = r.data.values;

  /* IF PHONE NUMBER IS SENT BUT NO ORDER NUMBER, WE CHECK TO SEE IF PHONE NUMBER EXISTS IN VERIFIED NUMBERS */
  if(!orderNumber) {
    console.log("Hit phone number check")
    for(let i = 0; i < r.length; i++) {
      let order = r[i][0];
      let o = r[i][1];
      let n = r[i][2];
      if(n && n == phoneNumber) {
        res.send({ message: "Phone number exists.", order})
      } 
      else if(!n && o == phoneNumber) {
        res.send({ message: "Phone number exists.", order})
      }
      else {
        res.send({ message: "Phone number does not exist."})
      }
    }
  }

  /* BOTH PHONE AND ORDER SENT, SO CHECK IF ORDER NUMBER EXISTS
     AND PARSE PHONE NUMBER FOR CONSISTENCY
     RESPOND IF NO UPDATES NECESSARY */
  let edited;
  // let returnMsg;
  let order;
  for (let i = 0; i < r.length; i++) {
    let ord = r[i][0];
    let o = r[i][1];
    let n = r[i][2];
    if (order == orderNumber.toUpperCase()) {
      if (o != phoneNumber && n != phoneNumber) {
        r[i][2] = phoneNumber;
        edited = i;
        // returnMsg = r[i][5].replace("<XXXXXX>", order);
        order = ord;
        // console.log("RETURN MSG: ", returnMsg)
        break;
      } else {
        if (n == phoneNumber) {
          res.send({
            message: "New number was previously edited and is the same as the currently requested.", order: ord
              /*"New number was previously edited and is the same as the currently requested."*/
          });
        } else {
          res.send({ message: "Phone number is the same.", order: ord /*"Phone number is the same."*/ });
        }
      }
    } else if (i == r.length - 1) {
      res.send({ message: "Order number does not exist." });
    }
  }

  let body = {
    values: r
  };

  /* IF UPDATES NECESSARY THEN MAKE CHANGES, THEN RESPOND TO USER */
  try {
    sheets.spreadsheets.values.update(
      {
        auth,
        spreadsheetId: ss_id,
        range: "'OptIn'!A1:F",
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
        res.send({ message: "successful and number has been added as new number", /*updated: response.config.data.values,*/ order });
      }
    );
  } catch (e) {
    console.log(e);
    res.send({ message: "error with updating sheet" });
  }
});

app.post('/opt-in-yes', (req, res) => {
  const { orderNumber } = req.body;

  let basicauth = Buffer.from(
    req.headers.authorization.slice(6),
    "base64"
  ).toString("binary");
  basicauth = basicauth.split(":");
  if (username != basicauth[0] || password != basicauth[1]) {
    res.send({ message: "Unauthorized!" });
  }

  var doc = new GoogleSpreadsheet();
  await doc.useServiceAccountAuth(credentials);
  const auth = new google.auth.OAuth2();
  auth.setCredentials(doc.jwtClient.credentials);
  console.log("AUTH1: ", auth);

  try {
    let r = await sheets.spreadsheets.values.get({
      auth,
      spreadsheetId: ss_id,
      range: "'OptIn'!A1:F"
    });
    r = r.data.values;

    for(let i = 1; i < r.length; i++) {
      let or = r[i][0];
      if(or === orderNumber) {
        r[i][3] = "Y";
        r[i][4] = new Date().toLocaleDateString();
      }
    }

    sheets.spreadsheets.values.update(
      {
        auth,
        spreadsheetId: ss_id,
        range: "'OptIn'!A1:F",
        valueInputOption: "USER_ENTERED",
        resource: r
      },
      (err, response) => {
        if (err) {
          console.log(err);
          res.status(500);
        }
        console.log(response);
        console.log(`${response.data.updatedRange} cells updated.`);
        res.send({ message: "successful and number has been added as new number", order });
      }
    );
  } catch (e) {
    console.log(e);
    res.send({ message: "error with updating sheet" });
  }
})

app.listen(port, () => {
  console.log(`listening to port ${port}`);
});
