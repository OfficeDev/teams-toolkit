param apimServiceName string = '${resourceBaseName}-apim-service'
param apimOauthServerName string = '${resourceBaseName}-apim-oauthserver'
param apimProductName string = '${resourceBaseName}-apim-product'
param apimUserId string
param apimClientId string
@secure()
param apimClientSecret string
param oauthAuthorityHost string = 'https://login.microsoftonline.com'
