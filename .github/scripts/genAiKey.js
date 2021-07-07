const fs = require("fs");

function genAiKey(path, aiKey) {
  try {
    const packageJson = JSON.parse(fs.readFileSync(path));
    packageJson.aiKey = aiKey;
    fs.writeFileSync(path, JSON.stringify(packageJson, null, 2) + "\n");
    console.log("Updated AiKey");
  } catch (e) {
    console.log(e);
    throw e;
  }
}

const args = process.argv.slice(2);
genAiKey(args[0], args[1]);