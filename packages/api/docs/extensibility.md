## Basic concepts

A TeamsFx project is composed two parts:
  1. capabilities: tab or bot
  2. resources: cloud resources that support the above capabilities (Azure SQL, Key Vault, Managed Identity) 

A resources can have dependencies in its self description, for example, Azure SQL depends on Managed Identity.

Resources are provided by resource provider plugins.

Plugin category | Extension point | Behavior
---|---|---
framework plugin | provide more tech framework| scaffold an empty project with specific framework (React, Angular, Vue, ...)
sample provider plugin | provide more sample codes| 1. setup the project prerequisite(add required resources); 2. scaffold sample code into the selected framework
resource provider plugin | provide more cloud resources| 1. provision cloud resources; 2. config app settings(with hosting capability); 3. deploy binary to cloud resources (with hosting capability) 4. define dependencies on other resource provider plugins

A project settings looks like:
```
project
  modules
    tab (framework = React, stack = nodejs12, resourceProvider = Azure storage)
    bot (framework = Bot framework, stack = nodejs12, resourceProvider = Azure Web App)
  resources
    Azure storage
    Azure function
	  Azure SQL
    Azure Web App
    Simple auth
	  Managed Identity
	  AAD
	  Teams App
```

## Flows

### create a new project from zero

1. ask questions for create:

  - ask capability
  - if tab enabled, list all framework plugins and ask framework questions for tab
  - if bot enabled, list all framework plugins and ask framework questions for bot
 
2. create project folder skeleton, create solution settings according to inputs (tab: framework, runtime stack, language, bot: framework, runtime stack, language), 

3. call plugins' scaffold() API (plugins = selected framework plugins)

4. call scaffold of app studio module, local debug module

### add feature (single sign in)

1. add aad and simple auth resources (build in)

2. update project settings

### add sample 

1. list all samples from sample provider plugins (built-in or online) and ask sample question

2. install sample plugin (optional) if necessary

3. call sample provider plugins' setup() API to add required resources OR developer can add manually

4. call sample provider plugins' scaffold() API to add sample codes.

### add resource

1. search and select resources to add

2. resources can be added to hosting tab or bot, or arbitrary usage

3. update project settings to active selected resources

### provision

1. config provision params for each resource provider plugin (optional)

1. call all resources' generateResourceTemplate or provision API to do provision

2. solution do provision based on outputs of resource templates.. (deploy arm templates)

3. call all resource plugins' configResource(settings, resource profiles) API to configuration

4. call app studio's provision to create teams app

### deploy

1. config deploy params for each resource provider plugin (optional)

2. list all resources' deploy API and ask user to select which resources to deploy

3. call resource provider plugins's deploy() API

4. call app studio module's deploy() API to update manifest

