"use strict";

require("dotenv").config();
let express = require("express");
let app = express();
let port = process.env.PORT || 3001;
const { google } = require("googleapis");
const sheets = google.sheets("v4");
const {
  credentials,
  decrypt,
  getAuth,
  phoneCheck,
  orderCheck
} = require("./util/helpers");

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get("/", (req, res) => {
  res.send("<h1>HELLO WORLD, WELCOME TO THE GM MIDDLEWARE.</h1>");
});

app.post("/append-order-number", async (req, res) => {
  let { orderNumber, phoneNumber } = req.body;
  let { username, password, ss_id } = process.env;
  // console.log("ORDER NUMBER: ", orderNumber);
  // console.log("PHONE NUMBER: ", phoneNumber);
  // console.log(req.headers.authorization);
  let basicauth = decrypt(req.headers.authorization.slice(6));
  if (username != basicauth[0] || password != basicauth[1]) {
    res.send({ message: "Unauthorized!" });
  }

  /* IF NO NUMBER WAS SENT */
  if (!phoneNumber) {
    res.send({ message: "No phone number was sent." });
  }

  /* REMOVE '+' FROM PHONE NUMBER */
  if (phoneNumber[0] === "+") {
    phoneNumber = phoneNumber.slice(1);
  }

  /* GET SHEET DATA VALUES FOR PARSING */
  let auth;
  let r;
  try {
    auth = await getAuth(credentials);
    r = await sheets.spreadsheets.values.get({
      auth,
      spreadsheetId: ss_id,
      range: "'OptIn'!A1:F"
    });
  } catch (e) {
    console.log(e);
    res.send({ message: "error authenticated with google sheet api" });
  }

  r = r.data.values;

  /* IF PHONE NUMBER IS SENT BUT NO ORDER NUMBER, WE CHECK TO SEE IF PHONE NUMBER EXISTS IN VERIFIED NUMBERS */
  if (!orderNumber) {
    let message = phoneCheck(phoneNumber, r);
    res.send(message);
  } else if (orderNumber) {
    /* BOTH PHONE AND ORDER SENT, SO CHECK IF ORDER NUMBER EXISTS
     AND PARSE PHONE NUMBER FOR CONSISTENCY
     RESPOND IF NO UPDATES NECESSARY */
    orderNumber = orderNumber.toUpperCase();
    let check = orderCheck(orderNumber, phoneNumber, r);
    if (!check.updates) {
      res.send({ ...check });
    }
    r = check.r;
    let { order } = check;

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
          console.log(response);
          res.send({
            message: "successful and number has been added as new number",
            order
          });
        }
      );
    } catch (e) {
      console.log(e);
      res.send({ message: "error with updating sheet" });
    }
  }
});

app.post("/opt-in-yes", async (req, res) => {
  let { orderNumber } = req.body;
  let { username, password, ss_id } = process.env;
  orderNumber = orderNumber.toUpperCase();

  let basicauth = decrypt(req.headers.authorization.slice(6));
  if (username != basicauth[0] || password != basicauth[1]) {
    res.send({ message: "Unauthorized!" });
  }

  let auth = await getAuth(credentials);
  try {
    let r = await sheets.spreadsheets.values.get({
      auth,
      spreadsheetId: ss_id,
      range: "'OptIn'!A1:F"
    });
    r = r.data.values;

    for (let i = 1; i < r.length; i++) {
      let or = r[i][0];
      if (or === orderNumber) {
        r[i][3] = "Y";
        r[i][4] = new Date().toLocaleDateString();
      }
    }

    let body = {
      values: r
    };

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
        console.log(response);
        console.log(`${response.data.updatedRange} cells updated.`);
        res.send({ message: "successful" });
      }
    );
  } catch (e) {
    console.log(e);
    res.send({ message: "error with updating sheet" });
  }
});

app.get("/get-push-notifications", async (req, res) => {
  let { username, password, ss_id } = process.env;
  let basicauth = decrypt(req.headers.authorization.slice(6));
  if (username != basicauth[0] || password != basicauth[1]) {
    res.send({ message: "Unauthorized!" });
  }

  let auth = await getAuth(credentials);
  try {
    let r = await sheets.spreadsheets.values.get({
      auth,
      spreadsheetId: ss_id,
      range: "'Push Notifications'!A1:B"
    });
    r = r.data.values;

    let mapToSend = [];
    /*
    {
            "consumerCountryCode": "1",
            "consumerPhoneNumber": "6783410143",
            "variables": {
            	"1": "Hi Kristin, it's me, the proactive api. A second time!",
                "2": "A second message just for fun"
            }
        },
    */
    for (let i = 1; i < r.length; i++) {
      let obj = {};
      let phone = r[i][0];
      obj.consumerCountryCode = phone.slice(0, 1);
      obj.consumerPhoneNumber = phone.slice(1);
      obj.variables = {
        "1": r[i][1]
      };
      mapToSend.push(obj);
    }

    res.send({ message: "success", push_notifications: mapToSend });
  } catch (e) {
    console.log(e);
    res.send({ message: "error getting values" });
  }
});

app.listen(port, () => {
  console.log(`listening to port ${port}`);
});
