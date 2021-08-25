module botProvision './botProvision.all.bicep' = {
  name: 'botProvision'
  params: {
    botAadClientId: bot_aadClientId
    botDisplayName: bot_displayName
    botServerfarmsName: bot_serverfarmsName
    botServiceName: bot_serviceName
    botServiceSKU: bot_serviceSKU
    botWebAppName: bot_sitesName
    botWebAppSKU: bot_webAppSKU
    identityName: test_identity_name
  }
}
module botConfiguration './botConfiguration.all.bicep' = {
  name: 'botConfiguration'
  dependsOn: [
    botProvision
  ]
  params: {
    botAadClientId: bot_aadClientId
    botAadClientSecret: bot_aadClientSecret
    botServiceName: bot_serviceName
    botWebAppName: bot_sitesName
    authLoginUriSuffix: authLoginUriSuffix
    m365ApplicationIdUri: m365ApplicationIdUri
    m365ClientId: m365ClientId
    m365ClientSecret: m365ClientSecret
    m365TenantId: m365TenantId
    m365OauthAuthorityHost: m365OauthAuthorityHost
    functionEndpoint: test_function_endpoint
    sqlDatabaseName: test_sql_database_name
    sqlEndpoint: test_sql_endpoint
    identityId: test_identity_id
  }
}
