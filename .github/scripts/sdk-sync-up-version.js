const path = require("path");
const semver = require("semver");
const fse = require("fs-extra");

const sdkPath = path.join(__dirname, "../../packages/sdk");

const sdkVersion = require(path.join(sdkPath, "package.json")).version;
const sdkName = require(path.join(sdkPath, "package.json")).name;
console.log(`======== sdk name: ${sdkName}, ========== sdk version: ${sdkVersion}`);
function recursivelyListPackageJsonFilePath(dir, list = []) {
    const arr = fse.readdirSync(dir);
    arr.forEach(function (item) {
        if (item === "node_modules") return list;
        const fullpath = path.join(dir, item);
        const stats = fse.statSync(fullpath);
        if (stats.isDirectory()) {
            recursivelyListPackageJsonFilePath(fullpath, list);
        } else if (item === "package.json") {
            list.push(fullpath);
        }
    });
    return list;
}

const templateDir = path.join(__dirname, "../../templates");
const depPkgs = recursivelyListPackageJsonFilePath(templateDir);
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
        fse.writeFileSync(file, JSON.stringify(pkg_, null, 4));
    }
}

// only alpha and stable release bump up version
let needBumpUp = process.argv[2] === "yes" ? true : false;
if (change && needBumpUp) {
    let file = path.join(templateDir, "package.json");
    let pkg_ = fse.readJsonSync(file);
    let ver = pkg_.version;
    if(semver.prerelease(sdkVersion)) {
        ver = semver.inc(ver, "prerelease", "alpha");
    } else {
        ver = semver.inc(ver, "patch");
    }

    pkg_.version = ver;
    fse.writeFileSync(file, JSON.stringify(pkg_, null, 4));

    file = path.join(templateDir, "package-lock.json");
    if (file) {
        pkg_ = fse.readJsonSync(file);
        pkg_.version = ver;
        fse.writeFileSync(file, JSON.stringify(pkg_, null, 4))
    }

    console.log("bump up templates version as ", ver);
}
