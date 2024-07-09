{
    "name": "{{SafeProjectNameLowerCase}}",
    "version": "1.0.0",
    "description": "Microsoft Teams Toolkit Command and Response Bot Sample",
    "engines": {
        "node": "16 || 18"
    },
    "author": "Microsoft",
    "license": "MIT",
    "main": "./lib/index.js",
    "scripts": {
        "dev:teamsfx": "env-cmd --silent -f .localConfigs npm run dev",
        "dev:teamsfx:testtool": "env-cmd --silent -f .localConfigs.testTool npm run dev",
        "dev:teamsfx:launch-testtool": "env-cmd --silent -f env/.env.testtool teamsapptester start",
        "dev": "nodemon --watch ./src --exec node --inspect=9239 --signal SIGINT -r ts-node/register ./src/index.ts",
        "build": "tsc --build && shx cp -r ./src/adaptiveCards ./lib/src",
        "start": "node ./lib/src/index.js",
        "watch": "nodemon --watch ./src --exec \"npm run start\"",
        "test": "echo \"Error: no test specified\" && exit 1"
    },
    "repository": {
        "type": "git",
        "url": "https://github.com"
    },
    "dependencies": {
        "@microsoft/teamsfx": "^2.3.1",
        "botbuilder": "^4.20.0",
        "restify": "^10.0.0"
    },
    "devDependencies": {
        "@types/restify": "^8.5.5",
        "@types/node": "^18.0.0",
        "env-cmd": "^10.1.0",
        "nodemon": "^2.0.7",
        "ts-node": "^10.4.0",
        "typescript": "^4.4.4",
        "shx": "^0.3.4"
    }
}