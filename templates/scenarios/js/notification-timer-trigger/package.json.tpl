{
    "name": "{%appName%}",
    "version": "1.0.0",
    "description": "Microsoft Teams Toolkit Notification Bot Sample",
    "author": "Microsoft",
    "license": "MIT",
    "scripts": {
        "dev": "func start --javascript --language-worker=\"--inspect=9239\" --port \"3978\" --cors \"*\"",
        "prepare-storage:teamsfx": "azurite --silent --location ./_storage_emulator --debug ./_storage_emulator/debug.log",
        "start": "npx func start",
        "test": "echo \"Error: no test specified\" && exit 1"
    },
    "repository": {
        "type": "git",
        "url": "https://github.com"
    },
    "dependencies": {
        "@microsoft/adaptivecards-tools": "^1.0.0",
        "@microsoft/teamsfx": "^2.0.0",
        "botbuilder": "^4.17.0"
    },
    "devDependencies": {
        "azurite": "^3.16.0",
        "@microsoft/teamsfx-run-utils": "alpha"
    }
}