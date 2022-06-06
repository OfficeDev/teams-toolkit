module {{moduleName}}Provision './provision/{{moduleName}}.bicep' = {
  name: '{{moduleName}}Provision'
  params: {
    provisionParameters: provisionParameters
    {{#if (contains "fx-resource-identity" plugins)}}
    userAssignedIdentityId: \{{fx-resource-identity.References.identityResourceId}}
    {{/if}}
  }
}

output {{moduleName}}Output object = {
  teamsFxPluginId: '{{pluginId}}'
  skuName: {{moduleName}}Provision.outputs.functionSKU
  siteName: {{moduleName}}Provision.outputs.functionName
  validDomain: {{moduleName}}Provision.outputs.domain
  appServicePlanName: {{moduleName}}Provision.outputs.appServicePlanName
  resourceId: {{moduleName}}Provision.outputs.functionResourceId
  siteEndpoint: {{moduleName}}Provision.outputs.functionEndpoint
}
