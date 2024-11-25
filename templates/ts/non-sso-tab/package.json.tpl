{
    "name": "{{SafeProjectNameLowerCase}}",
    "version": "0.1.0",
    "engines": {
        "node": "18 || 20"
    },
    "private": true,
    "main": "./lib/app.js",
    "dependencies": {
        "express": "^4.21.1",
        "send": "^0.18.0"
    },
    "devDependencies": {
        "@types/node": "^18.0.0",
        "@types/express": "^5.0.0",
        "@types/send": "^0.17.1",
        "env-cmd": "^10.1.0",
        "nodemon": "^3.1.7",
        "ts-node": "^10.9.1",
        "typescript": "^4.1.2",
        "shx": "^0.3.3"
    },
    "scripts": {
        "dev:teamsfx": "env-cmd --silent -f .localConfigs npm run start",
        "start": "nodemon --exec node --inspect=9239 --signal SIGINT -r ts-node/register src/app.ts",
        "build": "tsc --build && shx cp -r ./src/views ./src/static ./lib/",
        "test": "echo \"Error: no test specified\" && exit 1"
    },
    "homepage": "."
}
