# Publish Teams Backend (Azure Functions) to Azure API Management 

Azure API Management (APIM) is used to create consistent and modern API gateways for existing backend services. With Teams Toolkit or TeamsFx CLI, you can easily publish your backend APIs (Azure Functions) to existing or new APIM instance. 

## Prerequisite
-   [Node.js](https://nodejs.org/en/)
-	An M365 account, if you do not have M365 account, apply one from [M365 developer program](https://developer.microsoft.com/en-us/microsoft-365/dev-program)
-   An Azure account with an active subscription, [create an account for free](https://azure.microsoft.com/en-us/free/) and [register the resource provider 'Microsoft.ApiManagement' for the subscription](https://docs.microsoft.com/en-us/azure/azure-resource-manager/templates/error-register-resource-provider#solution-3---azure-portal)
-	Teams Toolkit or TeamsFx CLI

## Enable API Management Feature in TeamsFx
>Publish APIs to APIM requires Azure Functions in your project. If your project does not include Azure Functions, please note that we will automatically add one for you. Read about [Azure Functions in TeamsFx](https://github.com/OfficeDev/TeamsFx/tree/main/templates/function-base/js/default#readme) to learn more.

You can enable Azure API Management by following steps:
| Using Teams Toolkit| Using TeamsFx CLI|
| :------------------| :----------------|
| <ul><li>Open Teams Toolkit, and sign into Azure by clicking the `Sign in to Azure` under the `ACCOUNTS` section from sidebar.<sup>[1]</sup></li><li>After you signed in, select a subscription under your account.<sup>[1]</sup></li><li>Open command palette, select `Teams: Add Resources` and select `Register APIs in Azure API Management` in next step.</ul> | <ul><li>Run command `teamsfx account login azure`.<sup>[1]</sup></li><li>Run command `teamsfx account set --subscription $subscriptionId`.<sup>[1]</sup></li><li>Create a new API Management instance or use an existing API Management instance</li><ul><li>Create a new instance: Run command `teamsfx resource add azure-apim`.</li><li>Use an existing instance: Run command `teamsfx resource add azure-apim --apim-resource-group $resourceGroupName --apim-service-name $serviceName`.</li></ul></ul>|

>Note: We need your Azure account and subscription information here so you can specify whether to use an existing or new APIM instance. 

## Deploy to Azure
Simply deploy your project to the cloud when it’s ready by following these steps:
- Login to Azure account<sup>[1]</sup>
- Login to M365 account<sup>[1]</sup>
- Set An active subscription<sup>[1]</sup>
- Provision the resources in the cloud
- Deploy to the cloud

You can do this using the Teams Toolkit in Visual Studio Code or using the TeamsFx CLI:
| Using Teams Toolkit| Using TeamsFx CLI|
| :------------------| :----------------|
| <ul><li>Open Teams Toolkit, and sign into Azure by clicking the `Sign in to Azure` under the `ACCOUNTS` section from sidebar.<sup>[1]</sup></li> <li>After you signed in, select a subscription under your account.<sup>[1]</sup></li><li>Open Teams Toolkit, and sign into M365 by clicking the `Sign in to M365` under the `ACCOUNTS` section from sidebar.<sup>[1]</sup></li><li>Open the command palette and select: `Teams: Provision in the Cloud`.</li><li>Open the command palette and select: `Teams: Deploy to the Cloud`.</li></ul>  |<ul> <li>Run command `teamsfx account login azure`.<sup>[1]</sup></li> <li>Run command `teamsfx account set --subscription $subscriptionId`.<sup>[1]</sup></li> <li>Run command `teamsfx account login m365`.<sup>[1]</sup></li> <li> Run command `teamsfx provision`.</li> <li>Run command: `teamsfx deploy function apim --open-api-document openapi/openapi.json --api-prefix $apiPrefix --api-version $apiVersion`. </li></ul>|

In the deployment step, there will be some inputs needed:
- Select the resource `API Management`. The resource `Azure Function` should also be selected if the API changes have never been deployed to the cloud.
- The OpenAPI Specification File (Default: `openapi/openapi.json`).
- Input API prefix. The API Path will be `$apiPrefix-$resourceSuffix`. The API Name will be `$apiPrefix-$resourceSuffix-$apiVersion`.
- Select an existing API version or input a new API version.

> Note: This may incur costs in your Azure Subscription if you choose to create a new instance in pervious step.

## Write OpenAPI Document
Update the Open API document under the `openapi` folder. We support both yaml and json format for the Open API document. You need to author the Open API document and ensure the API schema is aligned with the function implementation. For how to generate the Open API document, we have the following recommendations.

### Recommended way 1: Using npm package swagger-jsdoc
- Run command: `npm install -g swagger-jsdoc`. 
- Annotating source code. Read [more](https://github.com/Surnet/swagger-jsdoc/) about how to use swagger-jsdoc to annotate the source code. Below is a sample annotation.
  - API annotation
    ```js
    /**
     * @openapi
     * /getUserProfile:
     *   get:
     *     summary: Get User Profile
     *     operationId: get-user-profile
     *     responses:
     *       '200':
     *         $ref: "#/components/responses/getUserProfileResponse"
     */
    ```
  - Response annotation
    ```js
    /**
     * @openapi
     * components:
     *   responses:
     *     getUserProfileResponse:
     *       description: 200 response
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               receivedHTTPRequestBody:
     *                 type: string
     *               userInfoMessage:
     *                 type: string
     *               graphClientMessage:
     *                 type: object
     */
    ```
- Create an OpenAPI definition file `openapi/openapi.definition.json` and input the title and version. Below is a sample definition file.
    ```json
    {
        "openapi": "3.0.1",
        "info": {
            "title": "{appName}",
            "version": "v1"
        }
    }
    ```
- Run command `swagger-jsdoc -d ./openapi/openapi.definition.json -o ./openapi/openapi.json ./api/getUserProfile/*`. Please change the file path `./api/getUserProfile/*` according to your modification.

### Recommended way 2: OpenAPI (Swagger) Editor in VS Code.
Below is a sample swagger file for the default http trigger function. You can copy the content into `./openapi/openapi.json`, follow the [OpenAPI Specification](https://swagger.io/resources/open-api/), and change the content according to your modification (E.g. `/getUserProfile` -> `/$yourFunctionName` ).

```json
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

## Documentation
-   Find help in [troubleshooting guide](https://aka.ms/teamsfx-apim-help) if you met any issues.
-   Read [more](https://aka.ms/teamsfx-apim-doc) about how APIs can be called from power apps after published to APIM.

## Code of Conduct

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).

For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

## Note
[1] Skip this step if it has been executed.