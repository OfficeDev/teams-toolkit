{
    "name": "{{SafeProjectNameLowerCase}}",
    "version": "1.0.0",
    "msteams": {
      "teamsAppId": null
    },
    "description": "Microsoft Teams Toolkit hello world Bot sample",
    "engines": {
        "node": "18 || 20"
    },
    "author": "Microsoft",
    "license": "MIT",
    "main": "src/index.js",
    "scripts": {
        "dev:teamsfx": "env-cmd --silent -f .localConfigs npm run dev",
        "dev": "nodemon --inspect=9239 --signal SIGINT ./src/index.js",
        "start": "node ./src/index.js",
        "watch": "nodemon ./src/index.js",
        "test": "echo \"Error: no test specified\" && exit 1"
    },
   "dependencies": {
        "adaptive-expressions": "^4.20.0",
        "adaptivecards-templating": "^2.3.1",
        "adaptivecards": "^3.0.1",
        "botbuilder": "^4.23.1",
        "express": "^5.0.1"
    },
    "devDependencies": {
        "env-cmd": "^10.1.0",
        "nodemon": "^3.1.7"
    }
}
