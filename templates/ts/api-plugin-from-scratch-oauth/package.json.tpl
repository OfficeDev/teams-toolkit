{
    "name": "apipluginoauth",
    "version": "1.0.0",
    "scripts": {
        "dev:teamsfx": "env-cmd --silent -f .localConfigs npm run dev",
        "dev": "func start --typescript --language-worker=\"--inspect=9229\" --port \"7071\" --cors \"*\"",
        "build": "tsc",
        "watch:teamsfx": "tsc --watch",
        "watch": "tsc -w",
        "prestart": "npm run build",
        "start": "npx func start",
        "test": "echo \"Error: no test specified\" && exit 1"
    },
    "dependencies": {
        "@azure/functions": "^4.3.0",
        "jwt-validate": "^0.5.0"
    },
    "devDependencies": {
        "@types/debug": "^4.1.12",
        "@types/node": "^20.14.9",
        "env-cmd": "^10.1.0",
        "rimraf": "^5.0.7",
        "typescript": "^4.1.6"
    },
    "main": "dist/src/functions/*.js"
}
