{
    "name": "{{SafeProjectNameLowerCase}}",
    "version": "1.0.0",
    "scripts": {
        "dev:teamsfx": "env-cmd --silent -f .localConfigs npm run dev",
        "dev": "nodemon --exec func start --javascript --language-worker=\"--inspect=9229\" --port \"7071\" --cors \"*\"",
        "start": "npx func start",
        "test": "echo \"Error: no test specified\" && exit 1",
        "keygen": "node ./src/keyGen.js"
    },
    "dependencies": {
        "@azure/functions": "^4.1.0"
    },
    "devDependencies": {
        "env-cmd": "^10.1.0",
        "nodemon": "^3.0.3"        
    },
    "main": "src/functions/*.js"
}
