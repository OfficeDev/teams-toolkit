const path = require('path')
const semver = require('semver')
const fse = require('fs-extra')

const templateDir = path.join(__dirname, "../../templates");

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

const depPkgs = recursivelyListPackageJsonFilePath(templateDir);
const templatesDeps = require(path.join(templateDir, 'package.json')).dependencies
for(let file of depPkgs) {
    const pkg_ = fse.readJsonSync(file);
    const dep_ = pkg_.dependencies;
    for(let templateDep in templatesDeps){
        for(let subTempDep in dep_) {
            let minVersion = semver.minVersion(dep_[subTempDep])
            if(templateDep === subTempDep && semver.prerelease(minVersion)){
                dep_[subTempDep] = templatesDeps[templateDep] 
            }
        }
    }
    pkg_.dependencies = dep_;
    fse.writeFileSync(file, JSON.stringify(pkg_, null, 4));
}