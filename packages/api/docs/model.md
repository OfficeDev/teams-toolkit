A TeamsFx project is composed of two types of components:
    1. module: have code in workspace, can be launched as local service (tab frontend, function backend, bot)
    2. resource: external resource that modules depends on without local code in workspace (Azure SQL, Key Vault, Managed Identity) 

project
  |--modules
  |   |--tab (scaffolding plugin = React frontend plugin, hosting plugin = Azure Storage plugin|Azure Static Web App plugin|Azure Web App plugin)
  |	  |--simple auth (scaffolding plugin = Simple auth plugin, hosting plugin = Azure Web App plugin)
  |	  |--function (scaffolding plugin = Azure function plugin, hosting plugin = Azure function plugin)
  |		|--bot (scaffolding plugin = Bot plugin, hosting plugin = Azure Web App plugin
  |--resources
	    |-- SQL (resource provider plugin = Azure SQL plugin)
	    |-- Identity (resource provider plugin = Identity plugin)
	    |-- AAD (resource provider plugin = AAD plugin)
	    |-- Teams App (resource provider plugin = App Studio plugin)
	
Three types of plugin: 
	1. scaffolding plugin: scaffold only
	2. hosting plugin: do local hosting, cloud provision, example: Azure Web App, Azure Storage, Azure Function App
	3. resource provider plugin: cloud provision, example: Azure SQL, Key Vault, Managed Identity

Relationship between components and plugins:
	1. module VS scaffolding plugin 1<-->m
	2. module VS hosting plugin m<--->m
	3. resource VS resource provider plugin 1<-->1

Each scaffolding plugin scaffold only one module, it will provide the extensibility of project modules.
Each resource provider plugin can provision only one type of resource, it will provide the extensibility of project resources.
One hosting plugin can provision multiple modules, it can be reused and will provide extensibility of project module hosting capability.