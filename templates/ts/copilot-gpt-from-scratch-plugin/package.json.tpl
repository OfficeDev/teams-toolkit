{
    "name": "{{SafeProjectNameLowerCase}}",
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
        "@azure/functions": "^4.3.0"
    },
    "devDependencies": {
        "env-cmd": "^10.1.0",
        "@types/node": "^18.11.9",
        "typescript": "^4.1.6"
    },
    "main": "dist/src/functions/*.js"
}
