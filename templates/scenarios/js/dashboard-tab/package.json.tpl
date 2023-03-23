{
    "name": "{{appName}}",
    "version": "0.1.0",
    "engines": {
        "node": "14 || 16 || 18"
    },
    "private": true,
    "dependencies": {
        "@fluentui/react": "^8.99.2",
        "@fluentui/react-charting": "^5.14.10",
        "@fluentui/react-components": "^9.7.1",
        "@fluentui/react-icons": "^2.0.186",
        "@fluentui/react-northstar": "0.62.0",
        "@fluentui/react-theme": "^9.1.3",
        "@microsoft/microsoft-graph-client": "^3.0.1",
        "@microsoft/teams-js": "^2.7.1",
        "@microsoft/teamsfx": "^2.0.1",
        "@microsoft/teamsfx-react": "^2.0.1",
        "@react-hook/resize-observer": "^1.2.6",
        "axios": "^0.21.1",
        "msteams-react-base-component": "^4.0.1",
        "react": "^16.14.0",
        "react-dom": "^16.14.0",
        "react-router-dom": "^5.1.2",
        "react-scripts": "^5.0.1"
    },
    "devDependencies": {
        "env-cmd": "^10.1.0"
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