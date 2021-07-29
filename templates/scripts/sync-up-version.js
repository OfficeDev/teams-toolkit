const fs = require("fs");
const path = require("path");
const loadJsonFile = require("load-json-file");
const writePkg = require("write-pkg");
const semver = require("semver");

const sdkVersion = require(path.join(__dirname, "../../packages/sdk/package.json")).version;
const sdkNname = require(path.join(__dirname, "../../packages/sdk/package.json")).name;

function listFile(dir, list = []) {
  var arr = fs.readdirSync(dir);
  arr.forEach(function (item) {
    var fullpath = path.join(dir, item);
    var stats = fs.statSync(fullpath);
    if (item === "node_modules") return list;
    if (stats.isDirectory()) {
      listFile(fullpath, list);
    } else {
      if (item === "package.json") list.push(fullpath);
    }
  });
  return list;
}

const templateDir = path.join(__dirname, "..");
const depPkgs = listFile(templateDir);
for (file of depPkgs) {
  let pkg_ = loadJsonFile.sync(file);
  let dep = pkg_.dependencies;
  if (dep) {
    let depMap = new Map(Object.entries(dep));
    if (depMap.get(sdkNname)) {
      if (semver.prerelease(sdkVersion)) {
        depMap.set(sdkNname, sdkVersion);
      } else if (!semver.intersects(depMap.get(sdkNname), sdkVersion)) {
        depMap.set(sdkNname, `^${sdkVersion}`);
      }
      pkg_.dependencies = Object.fromEntries(depMap);
      writePkg(file, pkg_);
    }
  }
}
