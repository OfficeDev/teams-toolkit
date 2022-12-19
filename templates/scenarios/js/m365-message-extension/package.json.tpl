{
  "name": "{%appName%}",
  "version": "1.0.0",
  "msteams": {
    "teamsAppId": null
  },
  "description": "Microsoft Teams Toolkit m365 message extension sample",
  "engines": {
    "node": ">=14 <=16"
  },
  "author": "Microsoft",
  "license": "MIT",
  "main": "index.js",
  "scripts": {
    "dev:teamsfx": "node teamsfx/script/run.js . teamsfx/.env.local",
    "dev": "nodemon --inspect=9239 --signal SIGINT ./index.js",
    "start": "node ./index.js",
    "watch": "nodemon ./index.js"
  },
  "dependencies": {
    "botbuilder": "~4.14.0",
    "restify": "~8.5.1"
  },
  "devDependencies": {
    "@microsoft/teamsfx-run-utils": "alpha",
    "nodemon": "^2.0.7"
  }
}
