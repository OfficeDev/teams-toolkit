param resourceBaseName string
@minLength(3)
@maxLength(24)
@description('Name of Storage Accounts for frontend hosting.')
param frontendHosting_storageName string = 'frontendstg${uniqueString(resourceBaseName)}'
param aadClientId string
@secure()
param aadClientSecret string
param m365TenantId string
param m365OauthAuthorityHost string
param simpleAuth_sku string = 'F1'
param simpleAuth_serverFarmsName string = '${resourceBaseName}-simpleAuth-serverfarms'
param simpleAuth_webAppName string = '${resourceBaseName}-simpleAuth-webapp'
var applicationIdUri = 'api:///${aadClientId}'
module frontendHostingProvision './frontendHostingProvision.bicep' = {
  name: 'frontendHostingProvision'
  params: {
    frontend_hosting_storage_name: frontendHosting_storageName
  }
}
module simpleAuthProvision './simpleAuthProvision.bicep' = {
  name: 'simpleAuthProvision'
  params: {
    simpleAuthServerFarmsName: simpleAuth_serverFarmsName
    simpleAuthWebAppName: simpleAuth_webAppName
    sku: simpleAuth_sku
    aadClientId: aadClientId
    aadClientSecret: aadClientSecret
    applicationIdUri: applicationIdUri
    frontendHostingStorageEndpoint: frontendHostingProvision.outputs.endpoint
    m365TenantId: m365TenantId
    oauthAuthorityHost: m365OauthAuthorityHost
  }
}
output frontendHosting_storageName string = frontendHostingProvision.outputs.storageName
output frontendHosting_endpoint string = frontendHostingProvision.outputs.endpoint
output frontendHosting_domain string = frontendHostingProvision.outputs.domain
output simpleAuth_skuName string = simpleAuthProvision.outputs.skuName
output simpleAuth_endpoint string = simpleAuthProvision.outputs.endpoint