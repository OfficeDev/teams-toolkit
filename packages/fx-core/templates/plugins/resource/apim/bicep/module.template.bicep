module apimProvision '\{{PluginOutput.fx-resource-apim.Modules.apimProvision.Path}}' = {
  name: 'apimProvision'
  params: {
    apimServiceName: apimServiceName
    productName: apimProductName
    publisherEmail: apimPublisherEmail
    publisherName: apimPublisherName
  }
}

module apimConfiguration '\{{PluginOutput.fx-resource-apim.Modules.apimConfiguration.Path}}' = {
  name: 'apimConfiguration'
  dependsOn: [
    apimProvision
  ]
  params: {
    apimServiceName: apimServiceName
    oauthServerName: apimOauthServerName
    clientId: apimClientId
    clientSecret: apimClientSecret
    m365TenantId: m365TenantId
    m365ApplicationIdUri:m365ApplicationIdUri
    m365OauthAuthorityHost: m365OauthAuthorityHost
  }
}
