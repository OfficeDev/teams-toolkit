
param function_serverfarmsName string = '${resourceBaseName}-function-serverfarms'
param function_webappName string = '${resourceBaseName}-function-webapp'
@minLength(3)
@maxLength(24)
@description('Name of Storage Accounts for function backend.')
param function_storageName string = 'functionstg${uniqueString(resourceBaseName)}'
param function_nodeVersion string
