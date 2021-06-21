const path = require("path");
const xlsx = require("node-xlsx");

// Parse a file
const workSheetsFromFile = xlsx.parse(path.resolve("xlsx/file.xlsx"));

module.exports = {
  workSheetsFromFile
}
