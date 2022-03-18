const path = require('path')
const semver = require('semver')
const fse = require('fs-extra')

const repoRoot = path.join(__dirname, "../..");
const templateDir = path.join(__dirname, "../../templates");
const templateDirs = require(path.join(templateDir, "package.json")).templates
let depPkgs  = [];
for(let subTempDir of templateDirs){
    const subTempPath = path.join(templateDir, subTempDir, "package.json")
    if(fse.existsSync(subTempPath)){
        depPkgs.push(subTempPath)
    }
}
const pkgDirs = require(path.join(repoRoot, "lerna.json")).packages;
let templatesDeps = {};
for(let pkgDir of pkgDirs) {
    const pkgPath = path.join(repoRoot, pkgDir, "package.json");
    const pkgName = require(pkgPath).name;
    const pkgVersion = require(pkgPath).version;
    templatesDeps[`${pkgName}`] = pkgVersion;
}
for(let file of depPkgs) {
    const pkg_ = fse.readJsonSync(file);
    const dep_ = pkg_.dependencies;
    let fileChange = false;
    for(let [key,value] of Object.entries(templatesDeps)){
        if(dep_[key] && semver.prerelease(semver.minVersion(dep_[key]))) {
            if(semver.prerelease(semver.minVersion(dep_[key])).includes("alpha") || semver.prerelease(semver.minVersion(dep_[key])).includes("rc")){
                continue;
            }
            fileChange = true;
            if(semver.prerelease(value)){
                dep_[key] = value;
            } else {
                dep_[key] = `^${value}`;
            }
        }
    }
    if(fileChange) {
        pkg_.dependencies = dep_;
        fse.writeFileSync(file, JSON.stringify(pkg_, null, 4));
    }
}