{
  "name": "{{SafeProjectNameLowerCase}}",
  "version": "1.0.0",
  "msteams": {
    "teamsAppId": null
  },
  "description": "Microsoft Teams Toolkit message extension Bot sample",
  "engines": {
    "node": "16 || 18"
  },
  "author": "Microsoft",
  "license": "MIT",
  "main": "index.js",
  "scripts": {
    "dev:teamsfx": "env-cmd --silent -f .localConfigs npm run dev",
    "dev": "nodemon --inspect=9239 --signal SIGINT ./index.js",
    "start": "node ./index.js",
    "watch": "nodemon ./index.js",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "dependencies": {
    "@microsoft/adaptivecards-tools": "^1.0.0",
    "botbuilder": "^4.20.1",
    "isomorphic-fetch": "^3.0.0",
    "restify": "^10.0.0"
  },
  "devDependencies": {
    "env-cmd": "^10.1.0",
    "nodemon": "^2.0.7"
  }
}
