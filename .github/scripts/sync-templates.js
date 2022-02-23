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
const syncOption = require(path.join(templateDir, 'package.json')).syncup
if(syncOption === false){
    console.log("config no sync up, just return")
    return
}
const templatesDeps = require(path.join(templateDir, 'package.json')).dependencies
for(let file of depPkgs) {
    const pkg_ = fse.readJsonSync(file);
    const dep = pkg_.dependencies;
    for(let templateDep of templatesDeps){
        if(dep && dep[templateDep]){
            dep[templateDep] = templatesDeps[templateDep];
        }
    }
    pkg_.dependencies = dep;
    fse.writeFileSync(file, JSON.stringify(pkg_, null, 4));
}
