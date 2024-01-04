{
    "name": "{{SafeProjectNameLowerCase}}",
    "version": "1.0.0",
    "license": "MIT",
    "main": "./lib/index.js",
    "scripts": {
        "build": "tsc --build && shx cp -r ./src/prompts ./lib/",
        "clean": "rimraf node_modules lib tsconfig.tsbuildinfo",
        "lint": "eslint **/src/**/*.{j,t}s{,x} --fix --no-error-on-unmatched-pattern",
        "start": "tsc --build && node ./lib/index.js",
        "test": "echo \"Error: no test specified\" && exit 1",
        "watch": "nodemon --watch ./src -e ts --exec \"yarn start\"",
        "dev:teamsfx": "nodemon --exec node --inspect=9239 --signal SIGINT -r ts-node/register ./src/index.ts"
    },
    "repository": {
        "type": "git",
        "url": "https://github.com"
    },
    "dependencies": {
        "@microsoft/teams-ai": "1.0.1",
        "botbuilder": "^4.21.3",
        "dotenv": "^16.3.1",
        "fs-extra": "^11.2.0",
        "js-yaml": "^4.1.0",
        "openapi-client-axios": "^7.4.0",
        "replace": "~1.2.0",
        "restify": "~11.1.0"
    },
    "devDependencies": {
        "@types/dotenv": "6.1.1",
        "@types/js-yaml": "^4.0.9",
        "@types/jsonwebtoken": "^9.0.5",
        "@types/restify": "8.5.11",
        "nodemon": "~1.19.4",
        "shx": "^0.3.4",
        "ts-node": "^10.9.2",
        "typescript": "^5.3.3"
    }
}
