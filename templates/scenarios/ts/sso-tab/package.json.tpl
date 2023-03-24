{
    "name": "{{appName}}",
    "version": "0.1.0",
    "engines": {
        "node": "14 || 16 || 18"
    },
    "private": true,
    "dependencies": {
        "@fluentui/react-northstar": "^0.62.0",
        "@microsoft/mgt-element": "^2.8.0",
        "@microsoft/mgt-react": "^2.8.0",
        "@microsoft/mgt-teamsfx-provider": "^2.8.0",
        "@microsoft/microsoft-graph-client": "^3.0.1",
        "@microsoft/teams-js": "^2.7.1",
        "@microsoft/teamsfx": "^2.2.0",
        "@microsoft/teamsfx-react": "^2.0.0",
        "axios": "^0.21.1",
        "react": "^16.14.0",
        "react-dom": "^16.14.0",
        "react-router-dom": "^5.1.2",
        "react-scripts": "^5.0.1"
    },
    "devDependencies": {
        "@types/node": "^12.0.0",
        "@types/react": "^16.14.6",
        "@types/react-dom": "^16.9.12",
        "@types/react-router-dom": "^5.1.7",
        "env-cmd": "^10.1.0",
        "typescript": "^4.1.2"
    },
    "scripts": {
        "dev:teamsfx": "env-cmd --silent -f .localSettings npm run start",
        "start": "react-scripts start",
        "build": "react-scripts build",
        "eject": "react-scripts eject",
        "test": "echo \"Error: no test specified\" && exit 1"
    },
    "eslintConfig": {
        "extends": [
            "react-app",
            "react-app/jest"
        ]
    },
    "browserslist": {
        "production": [
            ">0.2%",
            "not dead",
            "not op_mini all"
        ],
        "development": [
            "last 1 chrome version",
            "last 1 firefox version",
            "last 1 safari version"
        ]
    },
    "homepage": "."
}