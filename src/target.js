const fs = require("fs");

function clearDataFile() {
  fs.writeFileSync('data.json', "[]");
}

function saveDataToJSONFile(data) {
  const fileStr = fs.readFileSync('data.json');
  let fileData = JSON.parse(fileStr);
  if (!fileData.length) {
    fileData = [];
  }
  fileData.push(data);
  const saveData = JSON.stringify(fileData, null, "\t");
  fs.writeFileSync('data.json', saveData);
}

module.exports = {
  clearDataFile,
  saveDataToJSONFile
}
