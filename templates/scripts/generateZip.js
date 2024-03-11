const AdmZip = require("adm-zip");
const { readdirSync, rmSync } = require("node:fs");
const path = require("path");

const BUILD_PATH = path.join(__dirname, "..", "build");
const TEMPLATE_NAMES = ["common", "csharp", "js", "ts", "python"];

rmSync(BUILD_PATH, { recursive: true, force: true });

TEMPLATE_NAMES.forEach((name) => {
  const zip = new AdmZip();
  const templatePath = path.join(__dirname, "..", name);
  readdirSync(templatePath).forEach((dir) => {
    zip.addLocalFolder(path.join(templatePath, dir), dir);
  });
  console.log(`Generating ${name}.zip`);
  zip.writeZip(path.join(BUILD_PATH, `${name}.zip`));
});
