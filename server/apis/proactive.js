const router = require("express").Router();
const {
  credentials,
  getAuth,
  getSheetVals,
  updateSheetVals,
  clearSheetVals,
  formatProactiveCampMap,
  formatProactiveCampMapSendToFaaS
} = require("../../util/helpers");
const { checkBasicAuth } = require("../middleware/auth_middleware");

router.post("/log-proactive-campaigns", checkBasicAuth, async (req, res) => {
  let { proactive } = req.body;
  console.log(proactive);

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
    let response = await updateSheetVals('Proactive Campaign Map', 'A2:C', body, auth);
    if(response.error) {
      res.status(500);
    } else {
      res.send({ message: "successful" });
    }
  } catch (e) {
    console.log(e);
    res.send({ message: "error writing values" });
  }
});

router.get(
  "/get-proactive-campaign-status",
  checkBasicAuth,
  async (req, res) => {
    /* AUTH GOOGLE */
    let auth;
    let r;
    try {
      auth = await getAuth(credentials);
      r = await getSheetVals("Proactive Campaign Map", "A2:C", auth);
      console.log("RETURN FROM PROACTIVE CAMPAIGN STATUS CHECK: ", r);

      if (!r || !r.length) {
        res.send({ message: "No proactive campaigns have been scheduled." });
      } else if (r) {
        /* REFORMAT SHEET RESULTS AS PAYLOAD TO BE SENT TO FAAS */
        let mapToSend = formatProactiveCampMapSendToFaaS(r);

        /* CLEAN OUT PROACTIVE CAMPAIGN MAP */
        let response = await clearSheetVals('Proactive Campaign Map', 'A2:C', auth)
        if(response.error) {
          res.status(500)
        } else {
          res.send({ message: "success", campaign_map: mapToSend });
        }
      }
    } catch (e) {
      console.log(e);
      res.send({ message: "error getting values" });
    }
  }
);

module.exports = router;
