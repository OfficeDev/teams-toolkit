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