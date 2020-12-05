const router = require("express").Router();
const {
  credentials,
  getAuth,
  getSheetVals,
  configureProactivePayload,
  filterForPushNotificationsByPhone
} = require("../../util/helpers");
const { checkBasicAuth } = require("../middleware/auth_middleware");

router.get("/get-push-notifications", checkBasicAuth, async (req, res) => {
  /* AUTH GOOGLE */
  let auth;
  let r;
  try {
    auth = await getAuth(credentials);
    r = await getSheetVals("Push Notifications", "A1:B", auth);

    /* NO NOTIFICATIONS */
    if (!r || !r.length) {
      res.send({ message: "no push notifications" });
    } else if (r) {
      /* REFORMAT SHEET RESULTS AS PAYLOAD TO BE SENT TO PROACTIVE */
      let mapToSend = configureProactivePayload(r);
      res.send({ message: "success", push_notifications: mapToSend });
    }
  } catch (e) {
    console.log(e);
    res.send({ message: "error getting values" });
  }
});

router.post(
  "/get-push-notifications-by-phone",
  checkBasicAuth,
  async (req, res) => {
    let { phoneNumbers } = req.body;

    /* AUTH GOOGLE */
    let auth;
    let r;
    try {
      auth = await getAuth(credentials);
      r = await getSheetVals("Push Notifications", "A1:B", auth);

      /* NO NOTIFICATIONS */
      if (!r || !r.length) {
        res.send({ message: "no push notifications" });
      } else if (r) {
        /* FIND PUSH NOTIFICATIONS FOR SPECIFIED PHONE NUMBERS */
        let mapToSend = filterForPushNotificationsByPhone(r, phoneNumbers);
        res.send({ message: "success", push_notifications: mapToSend });
      }
    } catch (e) {
      console.log(e);
      res.send({ message: "error getting values" });
    }
  }
);

module.exports = router;
