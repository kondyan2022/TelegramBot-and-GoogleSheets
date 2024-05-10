const { GoogleSpreadsheet } = require("google-spreadsheet");
const { JWT } = require("google-auth-library");

const serviceAccountAuth = new JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const doc = new GoogleSpreadsheet(process.env.TABLE_ID, serviceAccountAuth);

doc
  .loadInfo()
  .then(() => {
    console.log(doc.title);
  })
  .catch((e) => console.log(e)); // loads document properties and worksheets

module.exports = doc;
