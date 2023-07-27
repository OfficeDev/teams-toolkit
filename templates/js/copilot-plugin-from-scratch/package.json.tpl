{
    "name": "{{SafeProjectNameLowerCase}}",
    "version": "1.0.0",
    "scripts": {
        "dev:teamsfx": "env-cmd --silent -f .localConfigs npm run dev",
        "dev": "func start --javascript --language-worker=\"--inspect=9229\" --port \"7071\" --cors \"*\"",
        "start": "npx func start",
        "test": "echo \"Error: no test specified\" && exit 1"
    },
    "dependencies": {
        "@azure/functions": "^1.2.2"
    },
    "devDependencies": {
        "env-cmd": "^10.1.0"
    }
}
