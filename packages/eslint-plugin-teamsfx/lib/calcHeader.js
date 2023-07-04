var fs = require("fs");
var content = fs.readFileSync("header-check.json", "utf8");
var data = JSON.parse(content);
var files = [];
data.forEach((result) => {
  result.messages.forEach((message) => {
    const ruleId = message.ruleId || "unknown";
    if (ruleId === "header/header") {
      files.push(result.filePath);
    }
  });
});
console.log(`Files with header issues: ${files.length}`);
files.forEach((file) => {
  console.log(file);
});
