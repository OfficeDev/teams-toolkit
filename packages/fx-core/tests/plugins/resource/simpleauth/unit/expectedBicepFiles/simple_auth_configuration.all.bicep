param simpleAuthWebAppName string
param m365TenantId string
param m365ClientId string
@secure()
param m365ClientSecret string
param m365ApplicationIdUri string
param oauthAuthorityHost string
param simpleAuthPackageUri string

param frontendHostingStorageEndpoint string

var aadMetadataAddress = uri(oauthAuthorityHost, '${m365TenantId}/v2.0/.well-known/openid-configuration')
var oauthAuthority = uri(oauthAuthorityHost, m365TenantId)
var teamsMobileOrDesktopAppClientId = '1fec8e78-bce4-4aaf-ab1b-5451cc387264'
var teamsWebAppClientId = '5e3ce6c0-2b1f-4285-8d4b-75ee78787346'
var officeWebAppClientId1 = '4345a7b9-9a63-4910-a426-35363201d503'
var officeWebAppClientId2 = '4765445b-32c6-49b0-83e6-1d93765276ca'
var outlookDesktopAppClientId = 'd3590ed6-52b3-4102-aeff-aad2292ab01c'
var outlookWebAppClientId = '00000002-0000-0ff1-ce00-000000000000'
var authorizedClientApplicationIds = '${teamsMobileOrDesktopAppClientId};${teamsWebAppClientId};${officeWebAppClientId1};${officeWebAppClientId2};${outlookDesktopAppClientId};${outlookWebAppClientId}'

resource simpleAuthDeploy 'Microsoft.Web/sites/extensions@2021-01-15' = {
  name: '${simpleAuthWebAppName}/MSDeploy'
  properties: {
    packageUri: simpleAuthPackageUri
  }
}

resource simpleAuthWebAppSettings 'Microsoft.Web/sites/config@2018-02-01' = {
  dependsOn: [
    simpleAuthDeploy
  ]
  name: '${simpleAuthWebAppName}/appsettings'
  properties: {
    AAD_METADATA_ADDRESS: aadMetadataAddress
    ALLOWED_APP_IDS: authorizedClientApplicationIds
    IDENTIFIER_URI: m365ApplicationIdUri
    CLIENT_ID: m365ClientId
    CLIENT_SECRET: m365ClientSecret
    OAUTH_AUTHORITY: oauthAuthority
    TAB_APP_ENDPOINT: frontendHostingStorageEndpoint
  }
}


