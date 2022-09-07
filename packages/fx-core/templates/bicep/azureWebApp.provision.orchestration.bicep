// Resources web app
module azureWebApp{{scenario}}Provision './provision/azureWebApp{{scenario}}.bicep' = {
  name: 'azureWebApp{{scenario}}Provision'
  params: {
    provisionParameters: provisionParameters
    userAssignedIdentityId: {{identity.resourceId}}
  }
}


output azureWebApp{{scenario}}Output object = {
  teamsFxPluginId: '{{componentId}}'
  skuName: azureWebApp{{scenario}}Provision.outputs.skuName
  siteName: azureWebApp{{scenario}}Provision.outputs.siteName
  domain: azureWebApp{{scenario}}Provision.outputs.domain
  appServicePlanName: azureWebApp{{scenario}}Provision.outputs.appServicePlanName
  resourceId: azureWebApp{{scenario}}Provision.outputs.resourceId
  siteEndpoint: azureWebApp{{scenario}}Provision.outputs.siteEndpoint
  {{#if (equals "Tab" scenario )}}
  endpoint: azureWebApp{{scenario}}Provision.outputs.siteEndpoint
  {{/if}}
}

output {{scenario}}Output object = {
  domain: azureWebApp{{scenario}}Provision.outputs.domain
  endpoint: azureWebApp{{scenario}}Provision.outputs.siteEndpoint
}
