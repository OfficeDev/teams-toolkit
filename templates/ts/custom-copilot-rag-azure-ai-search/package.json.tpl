{
    "name": "{{SafeProjectNameLowerCase}}",
    "version": "1.0.0",
    "msteams": {
        "teamsAppId": null
    },
    "description": "Microsoft Teams Toolkit RAG Bot Sample with Azure AI Search and Teams AI Library",
    "engines": {
        "node": "16 || 18"
    },
    "author": "Microsoft",
    "license": "MIT",
    "main": "./lib/src/index.js",
    "scripts": {
        "dev:teamsfx": "env-cmd --silent -f .localConfigs npm run dev",
        "dev:teamsfx:testtool": "env-cmd --silent -f .localConfigs.testTool npm run dev",
        "dev:teamsfx:launch-testtool": "env-cmd --silent -f env/.env.testtool teamsapptester start",
        "dev": "nodemon --exec node --inspect=9239 --signal SIGINT -r ts-node/register ./src/index.ts",
        "build": "tsc --build && shx cp -r ./src/prompts ./lib/src",
        "start": "node ./lib/src/index.js",
        "test": "echo \"Error: no test specified\" && exit 1",
        "watch": "nodemon --exec \"npm run start\"",
        "indexer:create": "npm run build && shx cp -r ./src/indexers/data ./lib/src/indexers && env-cmd --silent -f env/.env.testtool.user node ./lib/src/indexers/setup.js",
        "indexer:delete": "npm run build && env-cmd --silent -f env/.env.testtool.user node ./lib/src/indexers/delete.js"
    },
    "repository": {
        "type": "git",
        "url": "https://github.com"
    },
    "dependencies": {
        "@azure/search-documents": "^12.0.0",
        "@microsoft/teams-ai": "^1.1.0",
        "botbuilder": "^4.20.0",
        "openai": "~4.28.4",
        "restify": "^10.0.0"
    },
    "devDependencies": {
        "@types/restify": "^8.5.5",
        "@types/node": "^14.0.0",
        "env-cmd": "^10.1.0",
        "ts-node": "^10.4.0",
        "typescript": "^4.4.4",
        "nodemon": "^2.0.7",
        "shx": "^0.3.3"
    }
}