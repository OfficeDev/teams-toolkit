{
    "name": "{%appName%}",
    "version": "1.0.0",
    "description": "Microsoft Teams Toolkit Command and Response Bot Sample",
    "engines": {
        "node": ">=14 <=16"
    },
    "author": "Microsoft",
    "license": "MIT",
    "main": "./src/index.js",
    "scripts": {
        "dev:teamsfx": "env-cmd --silent -f .localSettings npm run dev",
        "dev": "nodemon --inspect=9239 --signal SIGINT ./src/index.js",
        "start": "node ./src/index.js",
        "watch": "nodemon ./src/index.js",
        "test": "echo \"Error: no test specified\" && exit 1"
    },
    "repository": {
        "type": "git",
        "url": "https://github.com"
    },
    "dependencies": {
        "@microsoft/adaptivecards-tools": "^1.0.0",
        "@microsoft/teamsfx": "^2.0.0",
        "botbuilder": "^4.18.0",
        "restify": "^10.0.0"
    },
    "devDependencies": {
        "env-cmd": "^10.1.0",
        "nodemon": "^2.0.7"
    }
}