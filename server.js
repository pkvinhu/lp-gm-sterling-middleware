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
  orderCheck,
  optInEditSheet,
  configureProactivePayload,
  filterForPushNotificationsByPhone,
  formatProactiveCampMap,
  formatProactiveCampMapSendToFaaS
} = require("./util/helpers");
let { username, password, ss_id } = process.env;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get("/", (req, res) => {
  res.send("<h1>HELLO WORLD, WELCOME TO THE GM MIDDLEWARE.</h1>");
});

app.post("/append-order-number", async (req, res) => {
  let { orderNumber, phoneNumber } = req.body;

  /* BASIC AUTHENTICATION */
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
  orderNumber = orderNumber.toUpperCase();

  /* BASIC AUTHENTICATION */
  let basicauth = decrypt(req.headers.authorization.slice(6));
  if (username != basicauth[0] || password != basicauth[1]) {
    res.send({ message: "Unauthorized!" });
  }

  /* AUTH GOOGLE */
  let auth;
  let r;
  try {
    auth = await getAuth(credentials);
    r = await sheets.spreadsheets.values.get({
      auth,
      spreadsheetId: ss_id,
      range: "'OptIn'!A1:F"
    });
    r = r.data.values;

    /* ADD YES AND DATE VALUES FOR OPT IN */
    r = optInEditSheet(orderNumber, r);

    let body = {
      values: r
    };

    /* GOOGLE SHEET API WRITE DATA */
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
        res.send({ message: "successful" });
      }
    );
  } catch (e) {
    console.log(e);
    res.send({ message: "error with updating sheet" });
  }
});

app.get("/get-push-notifications", async (req, res) => {
  /* BASIC AUTHENTICATION */
  let basicauth = decrypt(req.headers.authorization.slice(6));
  if (username != basicauth[0] || password != basicauth[1]) {
    res.send({ message: "Unauthorized!" });
  }

  /* AUTH GOOGLE */
  let auth;
  let r;
  try {
    auth = await getAuth(credentials);
    r = await sheets.spreadsheets.values.get({
      auth,
      spreadsheetId: ss_id,
      range: "'Push Notifications'!A1:B"
    });
    r = r.data.values;

    /* REFORMAT SHEET RESULTS AS PAYLOAD TO BE SENT TO PROACTIVE */
    let mapToSend = configureProactivePayload(r);

    res.send({ message: "success", push_notifications: mapToSend });
  } catch (e) {
    console.log(e);
    res.send({ message: "error getting values" });
  }
});

app.post("/get-push-notifications-by-phone", async (req, res) => {
  let { phoneNumbers } = req.body;

  /* BASIC AUTHENTICATION */
  let basicauth = decrypt(req.headers.authorization.slice(6));
  if (username != basicauth[0] || password != basicauth[1]) {
    res.send({ message: "Unauthorized!" });
  }

  /* AUTH GOOGLE */
  let auth;
  let r;
  try {
    auth = await getAuth(credentials);
    r = await sheets.spreadsheets.values.get({
      auth,
      spreadsheetId: ss_id,
      range: "'Push Notifications'!A1:B"
    });
    r = r.data.values;

    /* FIND PUSH NOTIFICATIONS FOR SPECIFIED PHONE NUMBERS */
    let mapToSend = filterForPushNotificationsByPhone(r, phoneNumbers);

    res.send({ message: "success", push_notifications: mapToSend });
  } catch (e) {
    console.log(e);
    res.send({ message: "error getting values" });
  }
});

app.post("/log-proactive-campaigns", async (req, res) => {
  let { proactive } = req.body;
  console.log(proactive)

  /* BASIC AUTHENTICATION */
  let basicauth = decrypt(req.headers.authorization.slice(6));
  if (username != basicauth[0] || password != basicauth[1]) {
    res.send({ message: "Unauthorized!" });
  }

  /* AUTH GOOGLE */
  let auth;
  try {
    auth = await getAuth(credentials);

    /* ADD YES AND DATE VALUES FOR OPT IN */
    let r = formatProactiveCampMap(proactive);

    let body = {
      values: r
    };

    /* GOOGLE SHEET API WRITE DATA */
    sheets.spreadsheets.values.update(
      {
        auth,
        spreadsheetId: ss_id,
        range: "'Proactive Campaign Map'!A2:C",
        valueInputOption: "USER_ENTERED",
        resource: body
      },
      (err, response) => {
        if (err) {
          console.log(err);
          res.status(500);
        }
        console.log(response);
        res.send({ message: "successful" });
      }
    );
  } catch (e) {
    console.log(e);
    res.send({ message: "error writing values" });
  }
});

app.get("/get-proactive-campaign-status", async (req, res) => {
  /* BASIC AUTHENTICATION */
  let basicauth = decrypt(req.headers.authorization.slice(6));
  if (username != basicauth[0] || password != basicauth[1]) {
    res.send({ message: "Unauthorized!" });
  }

  /* AUTH GOOGLE */
  let auth;
  let r;
  try {
    auth = await getAuth(credentials);
    r = await sheets.spreadsheets.values.get({
      auth,
      spreadsheetId: ss_id,
      range: "'Proactive Campaign Map'!A2:C"
    });
    r = r.data.values;

    /* REFORMAT SHEET RESULTS AS PAYLOAD TO BE SENT TO FAAS */
    let mapToSend = formatProactiveCampMapSendToFaaS(r);

    /* CLEAN OUT PROACTIVE CAMPAIGN MAP */
    await sheets.spreadsheets.values.clear(
      {
        auth,
        spreadsheetId: ss_id,
        range: "'Proactive Campaign Map'!A2:C",
        resource: {}
      },
      (err, response) => {
        if (err) {
          console.log(err);
        }
        console.log(response);
      }
    );

    res.send({ message: "success", campaign_map: mapToSend });
  } catch (e) {
    console.log(e);
    res.send({ message: "error getting values" });
  }
});

app.get("/healthcheck", async (req, res) => {
  const healthcheck = {
    uptime: process.uptime(),
    message: "OK",
    timestamp: Date.now()
  };
  try {
    res.send({ message: "Good health." });
  } catch (e) {
    healthcheck.message = e;
    res.status(503).send();
  }
});

app.listen(port, () => {
  console.log(`listening to port ${port}`);
});
