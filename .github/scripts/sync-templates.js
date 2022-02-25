const path = require('path')
const semver = require('semver')
const fse = require('fs-extra')

const templateDir = path.join(__dirname, "../../templates");
let depPkgs  = [];
function ThroughDirectory(Directory) {
    fse.readdirSync(Directory).forEach(File => {
        const Absolute = path.join(Directory, File);
        if (fse.statSync(Absolute).isDirectory() && File != "node_modules") return ThroughDirectory(Absolute);
        else if(File === "package.json") return depPkgs.push(Absolute);
    });
}
ThroughDirectory(templateDir)

const templatesDeps = require(path.join(templateDir, 'package.json')).dependencies

for(let file of depPkgs) {
    const pkg_ = fse.readJsonSync(file);
    const dep_ = pkg_.dependencies;
    let fileChange = false;
    for(let [key,value] of Object.entries(templatesDeps)){
        if(dep_[key] && semver.prerelease(semver.minVersion(dep_[key]))) {
            dep_[key]=value;
            fileChange = true;
        }
    }
    if(fileChange) {
        pkg_.dependencies = dep_;
        fse.writeFileSync(file, JSON.stringify(pkg_, null, 4));
    }
}