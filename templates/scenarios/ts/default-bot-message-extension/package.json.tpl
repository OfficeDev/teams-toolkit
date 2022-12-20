{
    "name": "{%appName%}",
    "version": "1.0.0",
    "description": "Microsoft Teams Toolkit hello world Bot sample",
    "engines": {
        "node": ">=14 <=16"
    },
    "author": "Microsoft",
    "license": "MIT",
    "main": "./lib/index.js",
    "scripts": {
        "dev:teamsfx": "node teamsfx/script/run.js . teamsfx/.env.local",
        "dev": "nodemon --exec node --inspect=9239 --signal SIGINT -r ts-node/register ./index.ts",
        "build": "tsc --build && shx cp -r ./adaptiveCards ./lib/",
        "start": "node ./lib/index.js",
        "watch": "nodemon --exec \"npm run start\"",
        "test": "echo \"Error: no test specified\" && exit 1"
    },
    "repository": {
        "type": "git",
        "url": "https://github.com"
    },
    "dependencies": {
        "@microsoft/adaptivecards-tools": "^1.0.0",
        "botbuilder": "^4.17.0",
        "restify": "^10.0.0"
    },
    "devDependencies": {
        "@microsoft/teamsfx-run-utils": "alpha",
        "@types/restify": "8.4.2",
        "ts-node": "^10.4.0",
        "typescript": "^4.4.4",
        "nodemon": "^2.0.7",
        "shx": "^0.3.3"
    }
}