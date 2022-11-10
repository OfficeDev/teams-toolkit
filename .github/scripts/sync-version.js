const path = require('path')
const semver = require('semver')
const fse = require('fs-extra')

const repoRoot = path.join(__dirname, "../..");

function updateTemplatesDeps(templateDir, templateList) {
    let depPkgs = [];
    for (let subTempDir of templateList) {
        const subTempPath = path.join(templateDir, subTempDir, "package.json")
        if (fse.existsSync(subTempPath)) {
            depPkgs.push(subTempPath)
        }
    }
    const pkgDirs = require(path.join(repoRoot, "lerna.json")).packages;
    let templatesDeps = {};
    for (let pkgDir of pkgDirs) {
        const pkgPath = path.join(repoRoot, pkgDir, "package.json");
        const pkgName = require(pkgPath).name;
        const pkgVersion = require(pkgPath).version;
        console.log('====================== updateTemplatesDeps: ', pkgName, " ver:",pkgVersion);
        templatesDeps[`${pkgName}`] = pkgVersion;
    }
    for (let file of depPkgs) {
        updateFileDeps(file, templatesDeps)
    }
}

function getSdkDeps() {
    const pkgPath = path.join(repoRoot, "packages", "sdk", "package.json");
    const sdkName = require(pkgPath).name;
    const sdkVer = require(pkgPath).version;
    const dep = {}
    dep[sdkName] = sdkVer;
    return dep;
}

function updateFileDeps(file, deps) {
    const pkg_ = fse.readJsonSync(file);
    const dep_ = pkg_.dependencies;
    let fileChange = false;
    for (let [key, value] of Object.entries(deps)) {
        if (dep_[key] && semver.prerelease(semver.minVersion(dep_[key]))) {
            if (!(semver.prerelease(semver.minVersion(dep_[key])).includes("alpha") || semver.prerelease(semver.minVersion(dep_[key])).includes("rc") || semver.prerelease(semver.minVersion(dep_[key])).includes("beta"))) {
                continue;
            }
            fileChange = true;
            if(semver.prerelease(value) && (semver.prerelease(value)[0] === "alpha" || semver.prerelease(value)[0] === "beta")){
                dep_[key] = value;
            } else {
                dep_[key] = `^${value}`;
            }
        }
    }
    if (fileChange) {
        pkg_.dependencies = dep_;
        fse.writeFileSync(file, JSON.stringify(pkg_, null, 4));
    }
}

function main() {
    const pathInput = process.argv[2];
    console.log('=================', __filename, " pathInput: ", pathInput);
    if (pathInput) {
        console.log('syncup ', pathInput);
        const content = getSdkDeps();
        const configFilePath = path.join(pathInput, "package.json");
        updateFileDeps(configFilePath, content);
    } else {
        console.log('syncup templates')
        const templateDir = path.join(__dirname, "../../templates");
        const templateV3Dir = path.join(templateDir, "scenarios");
        const templateList = require(path.join(templateDir, "package.json")).templates;
        const templateV3List = require(path.join(templateDir, "package.json")).templatesV3;
        updateTemplatesDeps(templateDir, templateList);
        updateTemplatesDeps(templateV3Dir, templateV3List);
    }
}

main()
