A TeamsFx project is composed of several components.

There are two types of components:
    1. workspace module(tab frontend, function backend, bot): have code in workspace, can be launched as local service 
    2. external resource that the workspace module depends on (Azure SQL, Key Vault, Managed Identity): no code in workspace

The components are organized as a dependency tree/grid:

project
  |--tab(workspace module) ---> scaffolding plugin, container hosting plugin (Azure Storage, Azure Static Web App, Azure Web App)
  |	  |--simple auth (workspace module)
  |	  |--function (workspace module)
  |			|--sql (resource)
  |			|   |--identity(resource, peer)
  |			|--identity(resource)
  |--bot(workspace module) ---> scaffolding plugin, container hosting plugin (Azure Web App)
  |	  |--sql(resource)
  |	  |   |--identity(resource, peer)
  |	  |--identity(resource)
  |--modules
  |   |-- function (workspace module) ---> scaffolding plugin, container hosting plugin
  |   |-- simple auth (workspace module) ---> scaffolding plugin, container hosting plugin (Azure Web App)
  |--resources
	  |-- sql ---> resource hosting plugin (SQL plugin)
	  |-- Identity ---> resource hosting plugin (Identity plugin)
	  |-- AAD ---> resource hosting plugin (AAD plugin)
	  |-- Teams App ---> resource hosting plugin (App Studio plugin)
	  
	  

	
three types of plugin: 
	1. scaffolding plugin: Tab Frontend scaffolding, Function scaffolding, Bot Scaffolding
	2. container hosting plugin(local hosting, cloud hosting): Azure Web App, Azure Storage, Azure Function App
	3. resource hosting plugin(cloud hosting): Azure SQL, Key Vault, Managed Identity

relationship between component and plugin:
	1. workspace module->scaffolding plugin 1<-->m
	2. workspace module->container hosting plugin   m<--->m
	3. resource->resource hosting plugin   1<-->1

plugin has dependencies：
	auto dependency
	conditional dependency: frontend hosting depends on simple auth if single-sign-in is wanted 
	

scaffolding plugin can describe the corresponding workspace module

resource hosting plugin can describe the corresponding resource component

container hosting plugin can host multiple workspace modules, so it can't describe the corresponding modules.
