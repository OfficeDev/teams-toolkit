
param bot_aadClientId string
@secure()
param bot_aadClientSecret string
param bot_serverfarmsName string = '${resourceBaseName}-bot-serverfarms'
param bot_webAppSKU string = 'F1'
param bot_serviceSKU string = 'F1'
param bot_sitesName string = '${resourceBaseName}-bot-sites'
param authLoginUriSuffix string = 'auth-start.html'
