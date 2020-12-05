const { decrypt } = require("../../util/helpers");
const { username, password } = process.env;

const checkBasicAuth = (req, res, next) => {
    /* BASIC AUTHENTICATION */
  let basicauth = decrypt(req.headers.authorization.slice(6));
  if (username != basicauth[0] || password != basicauth[1]) {
    res.send({ message: "Unauthorized!" });
  }
  else {
      next();
  }
}

module.exports = { checkBasicAuth };