@secure()
param provisionParameters object
// Resources web app
module webAppProvision './webApp.provision.module.bicep' = {
  name: 'webAppProvision'
  params: {
    provisionParameters: provisionParameters
  }
}
