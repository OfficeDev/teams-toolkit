# APIM Help
## NoValidOpenApiDocument
### Error Message
There is no valid OpenApi document under the workspace.
### Mitigation
Please add a legal OpenAPI document (v2 / v3) in the project directory. Both json format and yaml format are supported. 

## InvalidAadObjectId
### Error Message
The Azure Active Directory application with object id '{objectId}' could not be found.
### Mitigation
The property "apimClientAADObjectId" in the config file ".fx/env.default.json" is invalid. Please fill in an existing AAD object id or delete it and run provision command again.

## ApimOperationError
### Error Message
Failed to import API Management API. [Detail] One or more fields contain incorrect values. {reason}
### Mitigation
The OpenAPI document is invalid. Please change the OpenAPI document according to the reason in the error message. The OpenAPI limitation in Azure API Management can be found [here](https://docs.microsoft.com/en-us/azure/api-management/api-management-api-import-restrictions).

### Error Message
Failed to import API Management API. [Detail] One or more fields contain incorrect values. Cannot create API '{apiId}' with the same Path '{apiPath}' as API '{apiId}' unless it's a part of the same version set.
### Mitigation
Please change the title in the OpenAPI document and retry. The title in the OpenAPI document should be unique in the API Management service.

## AadOperationError
### Error Message
Failed to create Azure Active Directory. [Detail] Insufficient privileges to complete the operation.
### Mitigation
Please make sure that the user has permission to create Azure Active Directory. Or you can fill in an existing AAD information into the configuration items "apimClientAADObjectId" and "apimClientAADClientId".

### Error Message
Failed to create Service Principal. [Detail] When using this permission, the backing application of the service principal being created must in the local tenant.
### Mitigation
You should use the same account to login the popup page. To log in with another account, please reload the VSCode window.

