A TeamsFx project is composed of two types of components:
  1. module: have code in workspace, can be launched as local service (tab frontend, function backend, bot)
  2. resource: external resource that modules depends on without local code in workspace (Azure SQL, Key Vault, Managed Identity) 

Three types of plugins: 
	1. scaffolding plugin: scaffold only
	2. hosting plugin: do local hosting, cloud provision, example: Azure Web App, Azure Storage, Azure Function App
	3. resource provider plugin: cloud provision, example: Azure SQL, Key Vault, Managed Identity

project
  capability
    tab (framework = React, stack = nodejs 12)
    bot (framework = Bot framework, stack = nodejs 12)
  resources
    Azure storage
    Azure function
	  Azure SQL
    Azure Web App
    Simple auth
	  Managed Identity
	  AAD
	  Teams App
	
Relationship between components and plugins:
	1. module VS scaffolding plugin 1<-->m
	2. module VS hosting plugin m<--->m
	3. resource VS resource provider plugin 1<-->1

Each scaffolding plugin scaffold only one module, it will provide the extensibility of project modules.
Each resource provider plugin can provision only one type of resource, it will provide the extensibility of project resources.
One hosting plugin can provision multiple modules, it can be reused and will provide extensibility of project module hosting capability.