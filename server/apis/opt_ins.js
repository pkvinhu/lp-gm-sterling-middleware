const router = require("express").Router();
const { google } = require("googleapis");
const sheets = google.sheets("v4");
const {
  credentials,
  decrypt,
  getAuth,
  phoneCheck,
  orderCheck,
  optInEditSheet,
} = require("../../util/helpers");
let { username, password, ss_id } = process.env;

router.post("/check-order-info", async (req, res) => {
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
  
  router.post("/opt-in-yes", async (req, res) => {
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

module.exports = router;