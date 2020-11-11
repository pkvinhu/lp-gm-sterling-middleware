const router = require("express").Router();
const { google } = require("googleapis");
const sheets = google.sheets("v4");
const {
  credentials,
  decrypt,
  getAuth,
  formatProactiveCampMap,
  formatProactiveCampMapSendToFaaS
} = require("../../util/helpers");
let { username, password, ss_id } = process.env;

router.post("/log-proactive-campaigns", async (req, res) => {
  let { proactive } = req.body;
  console.log(proactive);

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

router.get("/get-proactive-campaign-status", async (req, res) => {
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
    console.log("RETURN FROM PROACTIVE CAMPAIGN STATUS CHECK: ", r);
    
    if(!r || !r.length) {
        res.send({ message: "No proactive campaigns have been scheduled."})
    }

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

module.exports = router;
