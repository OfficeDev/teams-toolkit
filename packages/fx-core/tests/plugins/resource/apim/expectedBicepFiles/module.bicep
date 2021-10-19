module apimProvision './apimProvision.bicep' = {
  name: 'apimProvision'
  params: {
    apimServiceName: apimServiceName
    productName: apimProductName
    publisherEmail: apimPublisherEmail
    publisherName: apimPublisherName
    oauthServerName: apimOauthServerName
    clientId: apimClientId
    clientSecret: apimClientSecret
    m365TenantId: m365TenantId
    m365ApplicationIdUri:m365ApplicationIdUri
    m365OauthAuthorityHost: m365OauthAuthorityHost
  }
}
