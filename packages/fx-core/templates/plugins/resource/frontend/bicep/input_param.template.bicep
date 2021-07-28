
@minLength(3)
@maxLength(24)
@description('Name of Storage Accounts for frontend hosting.')
param frontendHosting_storageName string = 'frontendstg${uniqueString(resourceBaseName)}'
