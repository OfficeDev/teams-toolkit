const path = require("path");
const writePkg = require("write-pkg");
const semver = require("semver");
const fse = require("fs-extra");

const sdkVersion = require(path.join(__dirname, "../../packages/sdk/package.json")).version;
const sdkName = require(path.join(__dirname, "../../packages/sdk/package.json")).name;

function listFile(dir, list = []) {
  const arr = fse.readdirSync(dir);
  arr.forEach(function (item) {
    if (item === "node_modules") return list;
    const fullpath = path.join(dir, item);
    const stats = fse.statSync(fullpath);
    if (stats.isDirectory()) {
      listFile(fullpath, list);
    } else if (item === "package.json") {
      list.push(fullpath);
    }
  });
  return list;
}

const templateDir = path.join(__dirname, "..");
const depPkgs = listFile(templateDir);
for (let file of depPkgs) {
  const pkg_ = fse.readJsonSync(file);
  const dep = pkg_.dependencies;
  if (dep && dep[sdkName]) {
    if (semver.prerelease(sdkVersion)) {
      dep[sdkName] = sdkVersion;
    } else if (!semver.intersects(dep[sdkName], sdkVersion)) {
      dep[sdkName] = `^${sdkVersion}`;
    } else {
      continue;
    }
    pkg_.dependencies = dep;
    writePkg(file, pkg_);
  }
}
