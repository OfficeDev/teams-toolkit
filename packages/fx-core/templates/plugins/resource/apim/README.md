# Publish Teams Backend (Azure Functions) to Azure API Management 

API Management (APIM) is a way to create consistent and modern API gateways for existing back-end services. With Teams Toolkit or TeamsFx CLI, you can easily publish your backend APIs (Azure Functions) to existing or new APIM instance. 

## Prerequisite
- An M365 account 
- Install Teams Toolkit or TeamsFx CLI 

## Enable API Management
We assume your Teams app project has included Azure Functions as backend. If you have not done so, please read this [document](../api/readme.md) to discover how to add Azure Functions to your project.  

You can enable Azure API Management by following steps:
- Use Teams Toolkit
  - Open Teams Toolkit, and sign into Azure by clicking the `Sign to Azure` under the `ACCOUNT` section from sidebar. 
  - After you signed in, select a subscription under your account. 
  - Open command palette, select `Teamsfx – Add Resources` and select `Azure API Management` in next step. 
  - Choose to create a new API Management instance or use an existing API Management instance.
- Use TeamsFx CLI
  - Run command `teamsfx account login azure`.
  - Run command `teamsfx account set --subscription $subscriptionId`.
  - Create a new API Management instance or use an existing API Management instance
    - [New] Run command `teamsfx resource add azure-apim`.
    - [Existing] Run command `teamsfx resource add azure-apim --apim-resource-group $resourceGroupName --apim-service-name $serviceName`.

Note: during the steps, we need your Azure account and subscription information so you can specify whether to use an existing or new APIM instance. 

## Deploy to Azure
Simply deploy your project to the cloud when it’s ready by following these steps: 
- Login to Azure account 
- Set An active subscription 
- Login to M365 account
- Provision the resources in the cloud 
- Deploy to the cloud 

You can do this by following steps: 
- Use Teams Toolkit
  - Open Teams Toolkit, sign into Azure by clicking the `Sign in to Azure` under the `ACCOUNT` section from sidebar. 
  - After you signed in, select a subscription under your account.
  - Sign into M365 by clicking the  `Sign in to M365` under the `ACCOUNT` section from sidebar. 
  - Open command palette, select: `Teamsfx - Provision in the Cloud`.
  - Open command palette, select: `Teamsfx - Deploy to the Cloud`.
    - Select an OpenAPI document. (default: `openapi/openapi.json`)
    - Input the API name prefix. 
    - Select an existing API version or input a new API version
- Use TeamsFx CLI
  - Run command `teamsfx account login azure`.
  - Run command `teamsfx account set --subscription $subscriptionId`. 
  - Run command `teamsfx account login m365`.
  - Run command `teamsfx provision`. 
  - Run command `teamsfx deploy function apim --open-api-document openapi/openapi.json --api-prefix $apiPrefix --api-version $apiVersion`. 

In the deployment step, there will be some inputs needed: 
- The OpenAPI Specification File. 
- Input API prefix. The API Path will be `$apiPrefix-$resourceSuffix`. The API Name will be `$apiPrefix-$resourceSuffix-$apiVersion`
- Enter new API Version or use an existing version. 

## Write OpenAPI Document
Update the Open API document under the `openapi` folder. We support both yaml and json format for the Open API document. You need to author the Open API document and ensure the API schema is aligned with the function implementation. For how to generate the Open API document, we have the following recommendations.

### Recommended way 1: Using npm package swagger-jsdoc 
- Run command: `npm install -g swagger-jsdoc`. 
- Annotating source code. [[Detail]](https://github.com/Surnet/swagger-jsdoc/)
- Edit the title and version in `openapi/openapi.json`.
- Run command: swagger-jsdoc -d `./openapi/openapi.json **/*.ts`

### Recommended way 2: OpenAPI (Swagger) Editor in VS Code.
Below is a sample swagger file for the default http trigger function. You can copy the content into `./openapi/openapi.json`, follow the [OpenAPI Specification](https://swagger.io/resources/open-api/), and change the content according to your modification (E.g. `/getUserProfile` -> `/$yourFunctionName` ).

```
{ 
    "openapi": "3.0.1", 
    "info": { 
        "title": "{appName}", 
        "version": "v1" 
    }, 
    "paths": {
        "/getUserProfile": {
            "get": {
                "summary": "Get User Profile",
                "operationId": "get-user-profile",
                "responses": {
                    "200": {
                        "description": "200 response",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "properties": {
                                        "receivedHTTPRequestBody": {
                                            "type": "string"
                                        },
                                        "userInfoMessage": {
                                            "type": "string"
                                        },
                                        "graphClientMessage": {
                                            "type": "object"
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    } 
} 
```