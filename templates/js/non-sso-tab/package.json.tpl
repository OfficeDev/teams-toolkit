{
    "name": "{{SafeProjectNameLowerCase}}",
    "version": "0.1.0",
    "engines": {
        "node": "16 || 18"
    },
    "private": true,
    "dependencies": {
        "restify": "^11.1.0",
        "send": "^0.18.0"
    },
    "devDependencies": {
        "env-cmd": "^10.1.0",
        "nodemon": "^2.0.21"
    },
    "scripts": {
        "dev:teamsfx": "env-cmd --silent -f .localConfigs npm run start",
        "start": "nodemon --inspect=9239 --signal SIGINT src/app.js",
        "test": "echo \"Error: no test specified\" && exit 1"
    },
    "homepage": "."
}
