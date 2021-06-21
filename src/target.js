const fs = require("fs");
const targetFile = "data/data.json";

function clearDataFile() {
  fs.writeFileSync(targetFile, "[]");
}

function saveDataToJSONFile(data) {
  const fileStr = fs.readFileSync(targetFile);
  let fileData = JSON.parse(fileStr);
  if (!fileData.length) {
    fileData = [];
  }
  fileData.push(data);
  const saveData = JSON.stringify(fileData, null, "\t");
  fs.writeFileSync(targetFile, saveData);
}

module.exports = {
  clearDataFile,
  saveDataToJSONFile
}
