// Resources for bot
var botAadAppClientId = provisionParameters['botAadAppClientId']
var botAadAppClientSecret = provisionParameters['botAadAppClientSecret']
var botServiceName = contains(provisionParameters, 'botServiceName') ? provisionParameters['botServiceName'] : '${resourceBaseName}-bot-service'
var botDisplayName = contains(provisionParameters, 'botDisplayName') ? provisionParameters['botDisplayName'] : '${resourceBaseName}-bot-displayname'
var botServerfarmsName = contains(provisionParameters, 'botServerfarmsName') ? provisionParameters['botServerfarmsName'] : '${resourceBaseName}-bot-serverfarms'
var botWebAppSKU = contains(provisionParameters, 'botWebAppSKU') ? provisionParameters['botWebAppSKU'] : 'F1'
var botSitesName = contains(provisionParameters, 'botSitesName') ? provisionParameters['botSitesName'] : '${resourceBaseName}-bot-sites'

module botProvision './botProvision.result.v2.bicep' = {
  name: 'botProvision'
  params: {
    serverfarmsName: botServerfarmsName
    botServiceName: botServiceName
    botAadAppClientId: botAadAppClientId
    botAadAppClientSecret: botAadAppClientSecret
    botDisplayName: botDisplayName
    webAppName: botSitesName
    webAppSKU: botWebAppSKU
    userAssignedIdentityId: userAssignedIdentityProvision.outputs.resourceId
  }
}
