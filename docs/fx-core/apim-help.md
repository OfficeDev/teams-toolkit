# APIM Help
## NoValidOpenApiDocument
### Error Message
There is no valid OpenAPI document under the workspace.
### Mitigation
Please add a valid OpenAPI document (v2 / v3) in the project directory. Both json format and yaml format are supported. [Here](https://swagger.io/resources/open-api/) is the OpenAPI Specification.

## InvalidOpenApiDocument
### Error Message
The file '{filePath}' is not a valid OpenApi document.
### Mitigation
Please add a valid OpenAPI document (v2 / v3) in the project directory. Both json format and yaml format are supported. [Here](https://swagger.io/resources/open-api/) is the OpenAPI Specification.

## InvalidAadObjectId
### Error Message
The Azure Active Directory application with object id '{objectId}' could not be found.
### Mitigation
The property `apimClientAADObjectId` in the config file `.fx/env.default.json` is invalid. Please fill in an existing AAD object id or delete it and run provision command again.

## ApimOperationError

| Error Message | Mitigation |
| :-------------| :----------|
|Failed: create API Management Service. The subscription is not registered to use namespace 'Microsoft.ApiManagement'. See https://aka.ms/rps-not-found for how to register subscriptions.| Register the resource provider namespace 'Microsoft.ApiManagement' for your subscription according to this [document](https://docs.microsoft.com/en-us/azure/azure-resource-manager/templates/error-register-resource-provider#solution-3---azure-portal).|
|Failed: import API Management API. [Detail] One or more fields contain incorrect values. {reason}. | The OpenAPI document is invalid. Please change the OpenAPI document according to the reason in the error message. The OpenAPI limitation in Azure API Management can be found [here](https://docs.microsoft.com/en-us/azure/api-management/api-management-api-import-restrictions).|
|Failed: import API Management API. [Detail] One or more fields contain incorrect values. Cannot create API '{apiId}' with the same Path '{apiPath}' as API '{apiId}' unless it's a part of the same version set. | Please change the title in the OpenAPI document and retry command `Teamsfx: Deploy to the cloud`. The title in the OpenAPI document should be unique in the API Management service.|

## AadOperationError
### Error Message
Failed: create Azure Active Directory application. [Detail] Insufficient privileges to complete the operation.
### Mitigation
Please make sure that the user has permission to create AAD application. Or you can fill in an existing AAD application information into the configuration items `apimClientAADObjectId` and `apimClientAADClientId` in `env.default.json`.

### Error Message
Failed: create Service Principal. [Detail] When using this permission, the backing application of the service principal being created must in the local tenant.
### Mitigation
You should use the same account to login the popup page. To log in with another account, you need to reload the VSCode window (command: `Developer: Reload Window`).

