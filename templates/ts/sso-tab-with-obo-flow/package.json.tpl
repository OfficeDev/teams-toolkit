{
  "name": "{{SafeProjectNameLowerCase}}",
  "version": "0.1.0",
  "engines": {
    "node": "18 || 20"
  },
  "private": true,
  "dependencies": {
    "@fluentui/react-components": "^9.18.0",
    "@microsoft/teams-js": "^2.13.0",
    "@microsoft/teamsfx": "^2.2.0",
    "@microsoft/teamsfx-react": "^3.0.0",
    "axios": "^0.21.1",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.8.0",
    "react-scripts": "^5.0.1"
  },
  "devDependencies": {
    "@types/node": "^14.0.0",
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0",
    "@types/react-router-dom": "^5.3.3",
    "concurrently": "^8.2.2",
    "env-cmd": "^10.1.0",
    "typescript": "^4.1.2"
  },
  "scripts": {
    "dev:teamsfx": "concurrently \"npm run dev-tab:teamsfx\" \"npm run dev-api:teamsfx\"",
    "dev-tab:teamsfx": "env-cmd --silent -f .localConfigs npm run start",
    "dev-api:teamsfx": "cd api && npm run dev:teamsfx",
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "echo \"Error: no test specified\" && exit 1",
    "eject": "react-scripts eject"
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
