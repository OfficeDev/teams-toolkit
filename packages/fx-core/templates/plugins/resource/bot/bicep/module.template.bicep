
module botProvision '{{PluginOutput.fx-resource-bot.Modules.botProvision.Path}}' = {
  name: 'botProvision'
  params: {
    botAadClientId: bot_aadClientId
    botAadClientSecret: bot_aadClientSecret
    botDisplayName: bot_displayName
    botServerfarmsName: bot_serverfarmsName
    botServiceName: bot_serviceName
    botServiceSKU: bot_serviceSKU
    botWebAppName: bot_sitesName
    botWebAppSKU: bot_webAppSKU
    authLoginUriSuffix: authLoginUriSuffix
    m365ApplicationIdUri: m365ApplicationIdUri
    m365ClientId: m365ClientId
    m365ClientSecret: m365ClientSecret
    m365TenantId: m365TenantId
    m365OauthAuthorityHost: m365OauthAuthorityHost
    {{#contains 'fx-resource-function' Plugins}}
    functionEndpoint: {{../PluginOutput.fx-resource-function.Outputs.functionEndpoint}}
    {{/contains}}
    {{#contains 'fx-resource-azure-sql' Plugins}}
    sqlDatabaseName: {{../PluginOutput.fx-resource-azure-sql.Outputs.databaseName}}
    sqlEndpoint: {{../PluginOutput.fx-resource-azure-sql.Outputs.sqlEndpoint}}
    {{/contains}}
    {{#contains 'fx-resource-identity' Plugins}}
    identityId: {{../PluginOutput.fx-resource-identity.Outputs.identityId}}
    identityName: {{../PluginOutput.fx-resource-identity.Outputs.identityName}}
    {{/contains}}
  }
}
