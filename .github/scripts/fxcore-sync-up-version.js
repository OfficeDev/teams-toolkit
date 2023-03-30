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

const currentBranch = process.argv[2];
console.log(
  `================== current branch: ${currentBranch} ==================`
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
const result = semver.minVersion(templateVersion);
if (!semver.prerelease(templateVersion)) {
  if (!semver.intersects(templateConfigFile.version, templateVersion)) {
    console.log(
      "================== template config version is not match with template latest release version, need bump up config version ^${templateVersion} =================="
    );
    templateConfigFile.version = `^${result.major}.${result.minor}.0`;
    fse.writeFileSync(
      templateConfig,
      JSON.stringify(templateConfigFile, null, 4)
    );
  }
} else if (templateVersion.includes("rc")) {
  console.log("sync up template in fx-core as 0.0.0-rc");
  templateConfigFile.version = "0.0.0-rc";
  fse.writeFileSync(
    templateConfig,
    JSON.stringify(templateConfigFile, null, 4)
  );
} else if (templateVersion.includes("alpha")) {
  if (currentBranch === "dev") {
    console.log("sync up template in fx-core as 0.0.0-alpha");
    templateConfigFile.version = "0.0.0-alpha";
    templateConfigFile.tagPrefix = "templates-";
    fse.writeFileSync(
      templateConfig,
      JSON.stringify(templateConfigFile, null, 4)
    );
  } else if (currentBranch === "prerelease") {
    console.log("sync up template in fx-core as 0.0.0-prerelease");
    templateConfigFile.version = "0.0.0-prerelease";
    templateConfigFile.tagPrefix = "templates-";
    fse.writeFileSync(
      templateConfig,
      JSON.stringify(templateConfigFile, null, 4)
    );
  }
}
