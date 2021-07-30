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
let change = false;
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
    change = true;
    pkg_.dependencies = dep;
    writePkg(file, pkg_);
  }
}

let needBumpUp = process.argv[2] === "yes" ? true : false;
if (change && needBumpUp) {
  let file = path.join(template_dir, "package.json");
  let pkg_ = loadJsonFile.sync(file);
  let ver = pkg_.version;
  ver = semver.inc(ver, "patch");
  pkg_.version = ver;
  writePkg(file, pkg_);

  file = path.join(template_dir, "package-lock.json");
  pkg_ = loadJsonFile.sync(file);
  pkg_.version = ver;
  writePkg(file, pkg_);
}
