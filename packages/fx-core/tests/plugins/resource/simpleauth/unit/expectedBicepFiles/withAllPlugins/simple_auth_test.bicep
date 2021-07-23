param sku string
param simpleAuthServerFarmsName string
param simpleAuthWebAppName string
param m365TenantId string
param AADClientId string
@secure()
param AADClientSecret string
param applicationIdUri string
param oauthAuthorityHost string

param frontendHostingStorageEndpoint string

var aadMetadataAddress = uri(oauthAuthorityHost, '${m365TenantId}/v2.0/.well-known/openid-configuration')
var oauthAuthority = uri(oauthAuthorityHost, m365TenantId)
var teamsMobileOrDesktopAppClientId = '1fec8e78-bce4-4aaf-ab1b-5451cc387264'
var teamsWebAppClientId = '5e3ce6c0-2b1f-4285-8d4b-75ee78787346'
var authorizedClientApplicationIds = '${teamsMobileOrDesktopAppClientId};${teamsWebAppClientId}'

resource simpleAuthServerFarms 'Microsoft.Web/serverfarms@2020-06-01' = {
  name: simpleAuthServerFarmsName
  location: resourceGroup().location
  sku: {
    name: sku
  }
  kind: 'app'
  properties: {
    reserved: false
  }
}

resource simpleAuthWebApp 'Microsoft.Web/sites@2020-06-01' = {
  kind: 'app'
  name: simpleAuthWebAppName
  location: resourceGroup().location
  properties: {
    reserved: false
    serverFarmId: simpleAuthServerFarms.id
    siteConfig: {
      alwaysOn: false
      http20Enabled: false
      numberOfWorkers: 1
    }
  }
}

resource simpleAuthWebAppSettings 'Microsoft.Web/sites/config@2018-02-01' = {
  parent:simpleAuthWebApp
  name: 'appsettings'
  properties: {
    AAD_METADATA_ADDRESS: aadMetadataAddress
    ALLOWED_APP_IDS: authorizedClientApplicationIds
    IDENTIFIER_URI: applicationIdUri
    CLIENT_ID: AADClientId
    CLIENT_SECRET: AADClientSecret
    OAUTH_AUTHORITY: oauthAuthority
    TAB_APP_ENDPOINT: frontendHostingStorageEndpoint
  }
}

output webAppName string = simpleAuthWebAppName
output skuName string = sku
output endpoint string = 'https://${simpleAuthWebApp.properties.hostNames[0]}'
