# APIM Help
## APIM.NoValidOpenApiDocument
### Error Message
There is no valid OpenAPI document under the workspace.
### Mitigation
To import the API definition to Azure API Management, you need to provide an OpenAPI specification for the backend API hosted in Azure Functions. Please add a valid OpenAPI document (v2 / v3) in the project's directory. Both json format and yaml format are supported. [Here](https://swagger.io/resources/open-api/) is the OpenAPI Specification.

## APIM.InvalidOpenApiDocument
### Error Message
The file '{filePath}' is not a valid OpenApi document.
### Mitigation
To import the API definition to Azure API Management, you need to provide an OpenAPI specification for the backend API hosted in Azure Functions. Please add a valid OpenAPI document (v2 / v3) in the project's directory. Both json format and yaml format are supported. [Here](https://swagger.io/resources/open-api/) is the OpenAPI Specification.

## APIM.InvalidAadObjectId
### Error Message
The Azure Active Directory application with object id '{objectId}' could not be found.
### Mitigation
The property `apimClientAADObjectId` in the config file `.fx/states/state.{envName}.json` is invalid. Please fill in an existing AAD object id or delete it and run provision command again.

## APIM.ApimOperationError

| Error Message | Mitigation |
| :-------------| :----------|
|Failed to register Resource Provider. The client '{user}' with object id '{object-id}' does not have authorization to perform action 'Microsoft.ApiManagement/register/action' over scope '{scope}' or the scope is invalid. If access was recently granted, please refresh your credentials.| The Azure account does not have authorization to register the resource provider. Please [elevate the subscription role](https://docs.microsoft.com/en-us/azure/role-based-access-control/rbac-and-directory-admin-roles) or manually register the resource provider namespace 'Microsoft.ApiManagement' for your subscription according to this [document](https://docs.microsoft.com/en-us/azure/azure-resource-manager/templates/error-register-resource-provider#solution-3---azure-portal).|
|Failed to import API Management API. [Detail] One or more fields contain incorrect values. {reason}. | The OpenAPI document is invalid. Please change the OpenAPI document according to the reason in the error message. The OpenAPI limitation in Azure API Management can be found [here](https://docs.microsoft.com/en-us/azure/api-management/api-management-api-import-restrictions).|
|Failed to import API Management API. [Detail] One or more fields contain incorrect values. Cannot create API '{apiId}' with the same Path '{apiPath}' as API '{apiId}' unless it's a part of the same version set. | Please change the title in the OpenAPI document and retry command `Teams: Deploy to the cloud`. The title in the OpenAPI document should be unique in the API Management service.|

## APIM.AadOperationError
### Error Message
Failed: create Azure Active Directory application. [Detail] Insufficient privileges to complete the operation.
### Mitigation
Please make sure that the user has permission to create AAD application. Or you can fill in an existing AAD application information into the configuration items `apimClientAADObjectId` and `apimClientAADClientId` in `.fx/states/state.{envName}.json`.

### Error Message
Failed: create Service Principal. [Detail] When using this permission, the backing application of the service principal being created must in the local tenant.
### Mitigation
You should use the same account to login the popup page. To log in with another account, you need to reload the VSCode window (command: `Developer: Reload Window`).

