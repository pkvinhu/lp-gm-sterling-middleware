let { GoogleSpreadsheet } = require("google-spreadsheet");
const { google } = require("googleapis");

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

const decrypt = auth => {
  //basicauth = <base64 encrypted version of `Basic <username>:<password>`>
  let basicauth = Buffer.from(auth, "base64").toString("binary");
  return basicauth.split(":");
};

const getAuth = async cr => {
  var doc = new GoogleSpreadsheet();
  await doc.useServiceAccountAuth(cr);
  const auth = new google.auth.OAuth2();
  auth.setCredentials(doc.jwtClient.credentials);
  console.log("AUTH1: ", auth);
  return auth;
};

const phoneCheck = (phoneNumber, r) => {
  for (let i = 1; i < r.length; i++) {
    let order = r[i][0];
    let o = r[i][1];
    let n = r[i][2];
    console.log(o, n, phoneNumber, order);
    if (n && n == phoneNumber) {
      return { message: "Phone number exists.", order };
    } else if (!n && o == phoneNumber) {
      return { message: "Phone number exists.", order };
    }
  }
  return { message: "Phone number does not exist." };
};

const orderCheck = (orderNumber, phoneNumber, r) => {
    let edited;
    let order;
    for (let i = 0; i < r.length; i++) {
      let ord = r[i][0];
      let o = r[i][1];
      let n = r[i][2];
      if (ord == orderNumber) {
        if (o != phoneNumber && n != phoneNumber) {
          r[i][2] = phoneNumber;
          edited = i;
          order = ord;
          break;
        } else {
          if (n == phoneNumber) {
            return {
              message:
                "New number was previously edited and is the same as the currently requested.",
              order: ord,
              updates: false
            };
          } else {
            return {
              message: "Phone number is the same.",
              order: ord,
              updates: false 
            };
          }
        }
      } else if (i == r.length - 1) {
        return { updates: false, message: "Order number does not exist." };
      }
    }
    return { updates: true, message: null, r, order };
}

const optInEditSheet = (orderNumber, r) => {
  for (let i = 1; i < r.length; i++) {
    let or = r[i][0];
    if (or === orderNumber) {
      r[i][3] = "Y";
      r[i][4] = new Date().toLocaleDateString();
    }
  }
  return r;
}

const configureProactivePayload = (r) => {
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
    return mapToSend;
}

module.exports = {
  credentials,
  decrypt,
  getAuth,
  phoneCheck,
  orderCheck,
  optInEditSheet,
  configureProactivePayload
};
