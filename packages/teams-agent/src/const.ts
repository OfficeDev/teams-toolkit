export const RECOMMEND_SERVICE = `
The project is a Microsoft Teams Tab App with Message Extension, built using React, TypeScript, and Node.js. It utilizes various Azure services such as Azure Functions, Azure Static Web Apps, Azure App Service, and Azure Bot Service. The app also uses components like Microsoft Teams JavaScript SDK, Fluent UI React Northstar, Bot Framework SDK, Restify, Microsoft TeamsFx, SQL Database, Microsoft Graph Client, and Tedious (SQL Server driver for Node.js).

| Azure Service         | Explanation |
|-----------------------|-------------------------------------------------------------------------------------------------------------------------------------|
| Azure App Service     | Azure App Service is suitable for hosting the Message Extension Bot as it provides a scalable and reliable platform for running web applications and APIs. |
| Azure Functions       | Azure Functions is suitable for this project as it provides serverless compute for running the HTTP Trigger functions, which can be used for backend processing. |
| Azure Bot Service     | Azure Bot Service is recommended for this project as it integrates with Microsoft Teams and provides a platform for building, deploying, and managing the Message Extension Bot. |
| Azure SQL Database    | Azure SQL Database is suitable for this project as it provides a fully managed relational database service for storing and managing the application's data. |
| Azure Application Insights | Azure Application Insights is recommended for this project as it provides monitoring and diagnostics capabilities for the application, helping to detect and diagnose issues and improve performance. |
| Azure Static Web Apps | Azure Static Web Apps is suitable for hosting the React web application and Teams Tab App with Message Extension as it provides frontend hosting with global distribution and automatic SSL. |
`;

export const IMPROVE_SERVICE = `
| Azure Service         | Explanation |
|-----------------------|-------------------------------------------------------------------------------------------------------------------------------------|
| Azure App Service     | Azure App Service is suitable for hosting the Message Extension Bot as it provides a scalable and reliable platform for running web applications and APIs. |
| Azure Functions       | Azure Functions is suitable for this project as it provides serverless compute for running the HTTP Trigger functions, which can be used for backend processing. |
| Azure Bot Service     | Azure Bot Service is recommended for this project as it integrates with Microsoft Teams and provides a platform for building, deploying, and managing the Message Extension Bot. |
| Azure SQL Database    | Azure SQL Database is suitable for this project as it provides a fully managed relational database service for storing and managing the application's data. |
| Azure Application Insights | Azure Application Insights is recommended for this project as it provides monitoring and diagnostics capabilities for the application, helping to detect and diagnose issues and improve performance. |
| Azure Static Web Apps | Azure Static Web Apps is suitable for hosting the React web application and Teams Tab App with Message Extension as it provides frontend hosting with global distribution and automatic SSL. |
| Azure Cache for Redis | Since the request frequency to the service is high, Azure Cache for Redis can be used to improve the performance and reduce the load on the backend database by caching frequently accessed data. This will help in handling high request frequency and improve the overall response time of the application. |
`;

export const GITHUB_ACTION = `
\`\`\`yaml
name: Deploy to Azure

on:
  push:
    branches:
      - main

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
    - name: Checkout repository
      uses: actions/checkout@v2

    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: 16

    - name: Install dependencies
      run: |
        cd tabs && npm ci && cd ..
        cd api && npm ci && cd ..
        cd bot && npm ci && cd ..

    - name: Build backend
      run: |
        cd api && npm run build
    - name: Setup dotnet
      uses: actions/setup-dotnet@v3
      with:
        dotnet-version: 3.1.x
    - name: Build backend dotnet
      run: |
        cd api && dotnet build extensions.csproj -o bin --ignore-failed-sources

    - name: Deploy backend to Azure Functions
      uses: azure/functions-action@v1
      with:
        app-name: <YOUR_AZURE_FUNCTIONS_APP_NAME>
        slot-name: <YOUR_AZURE_FUNCTIONS_SLOT_NAME>
        publish-profile: \${{ secrets.AZURE_FUNCTIONS_PUBLISH_PROFILE }}
        package: ./api

    - name: Build bot
      run: cd bot && npm run build

    - name: Deploy bot to Azure App Service
      uses: azure/webapps-deploy@v2
      with:
        app-name: <YOUR_AZURE_APP_SERVICE_NAME>
        publish-profile: \${{ secrets.AZURE_APP_SERVICE_PUBLISH_PROFILE }}
        package: ./bot

    - name: Build frontend
      run: cd tabs && npm run build

    - name: Deploy frontend to Azure Storage
      uses: azure/CLI@v1
      with:
        azcliversion: 2.0.72
        inlineScript: |
          az storage blob upload-batch --destination '$web' --source ./tabs/build --account-name <YOUR_AZURE_STORAGE_ACCOUNT_NAME> --account-key \${{ secrets.AZURE_STORAGE_ACCOUNT_KEY }}
\`\`\`
`;

export const DEFAULT =
  `
please try to ask one of following question:
1. /teamsAppToCloud Please help me generate the GitHub Actions pipeline for current project.
2. /teamsAppToCloud the request frequency to the service is high. Any plan to improve?
3. /teamsAppToCloud Generate the GitHub Actions.
`;

export const CREATE_SAMPLE_COMMAND_ID = 'teamsAgent.createSample';
