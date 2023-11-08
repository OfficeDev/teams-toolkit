const path = require('path')
const semver = require('semver')
const fse = require('fs-extra')
const fs = require('fs')

const repoRoot = path.join(__dirname, "../..");

function updateTemplatesDeps(templateDir, templateList) {
    let depPkgs = [];
    for (let subTempDir of templateList) {
        const pkgFiles = walkDir(path.join(templateDir,subTempDir));
        pkgFiles.forEach((subTempPath) => {
                depPkgs.push(subTempPath)
        });
    }
    // const pkgDirs = require(path.join(repoRoot, "lerna.json")).packages;
    const pkgDirs = ["packages/adaptivecards-tools-sdk", "packages/sdk", "packages/sdk-react"]
    let templatesDeps = {};
    for (let pkgDir of pkgDirs) {
        const pkgPath = path.join(repoRoot, pkgDir, "package.json");
        const pkgName = require(pkgPath).name;
        const pkgVersion = require(pkgPath).version;
        console.log('====================== updateTemplatesDeps: ', pkgName, " ver:", pkgVersion);
        templatesDeps[`${pkgName}`] = pkgVersion;
    }
    for (let file of depPkgs) {
        updateFileDeps(file, templatesDeps)
    }
}

function walkDir(dir) {
    var results = [];
    var list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = dir + '/' + file;
        var stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walkDir(file));
        } else { 
            if(path.basename(file).startsWith('package.json')){
                results.push(file);
            }
        }
    });
    return results;
}

function updateFileDeps(file, deps) {
    const pkg_ = fse.readJsonSync(file);
    const dep_ = pkg_.dependencies;
    let fileChange = false;
    for (let [key, value] of Object.entries(deps)) {
        if (dep_[key]) {
            fileChange = true;
            if (semver.prerelease(value)) {
                dep_[key] = value;
            } else {
                dep_[key] = `^${value}`;
            }
        }
    }
    if (fileChange) {
        pkg_.dependencies = dep_;
        fse.writeFileSync(file, JSON.stringify(pkg_, null, 2));
    }
}

function main() {
    const pathInput = process.argv[2];
    console.log('================= syncup templates', __filename)
    const templateDir = path.join(__dirname, "../../templates");
    const templateList = require(path.join(templateDir, "package.json")).templates;
    updateTemplatesDeps(templateDir, templateList);
}

main()