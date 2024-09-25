{
    "name": "{{SafeProjectNameLowerCase}}",
    "version": "1.0.0",
    "description": "Microsoft Teams Toolkit message extension search sample",
    "engines": {
        "node": "16 || 18 || 20"
    },
    "author": "Microsoft",
    "license": "MIT",
    "main": "./lib/src/index.js",
    "scripts": {
        "dev:teamsfx": "env-cmd --silent -f .localConfigs npm run dev",
        "dev:teamsfx:testtool": "env-cmd --silent -f .localConfigs.testTool npm run dev",
        "dev:teamsfx:launch-testtool": "env-cmd --silent -f env/.env.testtool teamsapptester start",
        "dev": "nodemon --exec node --inspect=9239 --signal SIGINT -r ts-node/register ./src/index.ts",
        "build": "tsc --build",
        "start": "node ./lib/src/index.js",
        "test": "echo \"Error: no test specified\" && exit 1",
        "watch": "nodemon --exec \"npm run start\""
    },
    "repository": {
        "type": "git",
        "url": "https://github.com"
    },
    "dependencies": {
        "adaptive-expressions": "^4.20.0",
        "adaptivecards-templating": "^2.3.1",
        "adaptivecards": "^3.0.1",
        "botbuilder": "^4.20.0",
        "restify": "^11.1.0"
    },
    "devDependencies": {
        "@types/restify": "^8.5.5",
        "@types/node": "^20.8.9",
        "env-cmd": "^10.1.0",
        "ts-node": "^10.4.0",
        "typescript": "^4.4.4",
        "nodemon": "^3.0.1",
        "shx": "^0.3.3"
    }
}