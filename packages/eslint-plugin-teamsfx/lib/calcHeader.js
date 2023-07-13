var fs = require("fs");
var content = fs.readFileSync("header-check.json", "utf8");
var data = JSON.parse(content);
var files = [];
for (const result of data) {
    for (const message of result.messages) {
        const ruleId = message.ruleId;
        if (ruleId === "header/header") {
            files.push(result.filePath);
        }
    }
}
// data.forEach((result) => {
//   result.messages.forEach((message) => {
//     const ruleId = message.ruleId;
//     if (ruleId === "header/header") {
//       files.push(result.filePath);
//     }
//   });
// });
console.log(`Files with header issues: ${files.length}`);
for (const file of files) {
    console.log(file);
}
// files.forEach((file) => {
//   console.log(file);
// });
if (files.length > 0) {
  process.exit(1);
}
