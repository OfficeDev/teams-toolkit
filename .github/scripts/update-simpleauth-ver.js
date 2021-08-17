const fs = require("fs");
const path = require("path")
const simpleauth = path.join(__dirname, "../../packages/simpleauth")
const xml2js = require(path.join(simpleauth, "node_modules/xml2js"))
const csprojFile = path.join(simpleauth, "src/TeamsFxSimpleAuth/Microsoft.TeamsFx.SimpleAuth.csproj");
const simpleauthVer = require(path.join(simpleauth, "package.json")).version
console.log("===== simple auth version: ", simpleauthVer)
// update .csproj file
fs.readFile(csprojFile, "utf-8", (err, data) => {
    if (err) {
        throw err;
    }

    // convert XML data to JSON object
    xml2js.parseString(data, (err, result) => {
        if (err) {
            throw err;
        }

        // replace `version` with new version
        for(let prop of result['Project'].PropertyGroup) {
            if(prop.Version) {
                prop.Version[0] = simpleauthVer;
                break;
            }
        }
        // convert SJON objec to XML
        const builder = new xml2js.Builder({trim: true, headless: true});
        const xml = builder.buildObject(result);

        // write updated XML string to a file
        fs.writeFile(csprojFile, xml, (err) => {
            if (err) {
                throw err;
            }
            console.log(`Updated XML is written to a new file.`);
        });

    });
});