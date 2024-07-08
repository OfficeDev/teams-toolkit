{
  "name": "{{SafeProjectNameLowerCase}}",
  "version": "1.0.0",
  "msteams": {
    "teamsAppId": null
  },
  "description": "Microsoft Teams Toolkit message extension search sample",
  "engines": {
    "node": "16 || 18 || 20"
  },
  "author": "Microsoft",
  "license": "MIT",
  "main": "./src/index.js",
  "scripts": {
    "dev:teamsfx": "env-cmd --silent -f .localConfigs npm run dev",
    "dev:teamsfx:testtool": "env-cmd --silent -f .localConfigs.testTool npm run dev",
    "dev:teamsfx:launch-testtool": "env-cmd --silent -f env/.env.testtool teamsapptester start",
    "dev": "nodemon --inspect=9239 --signal SIGINT ./src/index.js",
    "start": "node ./src/index.js",
    "watch": "nodemon ./src/index.js"
  },
  "dependencies": {
    "adaptive-expressions": "^4.20.0",
    "adaptivecards-templating": "^2.3.1",
    "adaptivecards": "^3.0.1",
    "botbuilder": "^4.20.0",
    "restify": "^11.1.0"
  },
  "devDependencies": {
    "env-cmd": "^10.1.0",
    "nodemon": "^3.0.1"
  }
}
