{
  "name": "{{SafeProjectNameLowerCase}}",
  "version": "1.0.0",
  "msteams": {
    "teamsAppId": null
  },
  "description": "Microsoft Teams Toolkit message extension search sample",
  "engines": {
    "node": "16 || 18"
  },
  "author": "Microsoft",
  "license": "MIT",
  "main": "./src/index.js",
  "scripts": {
    "dev:teamsfx": "env-cmd --silent -f .localConfigs npm run dev",
    "dev": "nodemon --inspect=9239 --signal SIGINT ./src/index.js",
    "start": "node ./src/index.js",
    "watch": "nodemon ./src/index.js"
  },
  "dependencies": {
    "botbuilder": "^4.20.0",
    "restify": "^10.0.0"
  },
  "devDependencies": {
    "env-cmd": "^10.1.0",
    "nodemon": "^2.0.7"
  }
}
