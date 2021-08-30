output bot_webAppSKU string = botProvision.outputs.botWebAppSKU
output bot_serviceSKU string = botProvision.outputs.botServiceSKU
output bot_webAppName string = botProvision.outputs.botWebAppName
output bot_domain string = botProvision.outputs.botDomain
output bot_appServicePlanName string = botProvision.outputs.appServicePlanName
{{#ifCond createNewBotService true}}
output bot_serviceName string = botProvision.outputs.botServiceName
{{/ifCond}}
output bot_webAppEndpoint string = botProvision.outputs.botWebAppEndpoint
