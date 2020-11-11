const router = require("express").Router();
const { google } = require("googleapis");
const sheets = google.sheets("v4");
const {
  credentials,
  decrypt,
  getAuth,
  configureProactivePayload,
  filterForPushNotificationsByPhone
} = require("../../util/helpers");
let { username, password, ss_id } = process.env;

router.get("/get-push-notifications", async (req, res) => {
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

router.post("/get-push-notifications-by-phone", async (req, res) => {
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

module.exports = router;
