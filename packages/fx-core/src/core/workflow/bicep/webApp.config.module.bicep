// Auto generated content, please customize files under provision folder

@secure()
param provisionOutputs object
// Get existing app settings for merge
var currentAppSettings = list('${provisionOutputs.webAppOutput.value.webAppResourceId}/config/appsettings', '2021-02-01').properties

var webAppName = split(provisionOutputs.webAppOutput.value.webAppResourceId, '/')[8]

resource botWebAppSettings 'Microsoft.Web/sites/config@2021-02-01' = {
  name: '${webAppName}/appsettings'
  properties: union({}, currentAppSettings)
}
