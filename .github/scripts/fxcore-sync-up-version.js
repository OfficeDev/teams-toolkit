const path = require("path");
const semver = require("semver");
const fse = require("fs-extra");

const templatePath = path.join(__dirname, "../../templates");
const templateVersion = require(path.join(
  templatePath,
  "package.json"
)).version;

console.log(
  `================== template version: ${templateVersion} ==================`
);

const fxCorePath = path.join(__dirname, "../../packages/fx-core");
const templateConfig = path.join(
  fxCorePath,
  "./src/common/templates-config.json"
);
const templateConfigFile = fse.readJsonSync(templateConfig);

console.log(
  `================== template version in fx-core configurate as ${templateConfigFile.version} ==================`
);
if (!semver.prerelease(templateVersion)) {
  if (!semver.intersects(templateConfigFile.version, templateVersion)) {
    const parsedTemplateVersion = semver.parse(templateVersion);
    const templateVersionRange = `~${parsedTemplateVersion.major}.${parsedTemplateVersion.minor}`;
    console.log(
      `================== template config version is not match with template latest release version, need bump up config version ${templateVersionRange} ==================`
    );
    templateConfigFile.version = templateVersionRange;
  }
  templateConfigFile.useLocalTemplate = false;
} else if (templateVersion.includes("rc")) {
  console.log("sync up template in fx-core as 0.0.0-rc");
  templateConfigFile.version = "0.0.0-rc";
  templateConfigFile.useLocalTemplate = false;
} else {
  console.log("configure fx-core useLocalTemplate as true");
  templateConfigFile.useLocalTemplate = true;
}

fse.writeFileSync(templateConfig, JSON.stringify(templateConfigFile, null, 4));
