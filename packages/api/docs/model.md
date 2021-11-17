A TeamsFx project is composed of two types of components:
  1. module: have code in workspace, can be launched as local service (tab frontend, function backend, bot)
  2. resource: cloud resource that modules depends on (Azure SQL, Key Vault, Managed Identity) 

Three types of plugins: 
	1. framework plugin: scaffold an empty project with specific framework (React, Angular, Vue, ...)
  2. sample provider plugin: setup the project prerequisite(add required resources) and scaffold sample code into the selected framework
	3. resource provider plugin: provision cloud resources, resource provider plugin has hosting property (whether it can host)

project
  modules
    tab (framework = React, stack = nodejs12, resourceProvider = Azure storage)
    bot (framework = Bot framework, stack = nodejs12, resourceProvider = Azure Web App)
    function (framework = ???, stack = nodejs12, resourceProvider = Azure function)
  resources
    Azure storage
    Azure function
	  Azure SQL
    Azure Web App
    Simple auth
	  Managed Identity
	  AAD
	  Teams App