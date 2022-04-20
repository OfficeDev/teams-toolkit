// Resources web app
module webAppProvision './provision/azureWebApp.bicep' = {
  name: 'azureWebAppProvision'
  params: {
    provisionParameters: provisionParameters
  }
}
