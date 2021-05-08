# Env Checker FAQ

## The toolkit cannot find Node.js on your machine

As the TeamsFx project is implemented by `Node.js`, it's required to install the npm pacakges and run the project in local. Please refer to [nodejs.org](https://nodejs.org/) to install the right version: Currently only LTS versions (v10, v12 and v14) are supported by TeamsFx, and `Node v14` would be recommended to be installed.

**NOTE**
* There are known issues with using `npm@7`, packaged with `Node v15` and later. If you have problems running npm install, it would be recommended to use `Node v14 (LTS)` instead.
* Please restart all your Visual Studio Code instances after the installation is finished.

## Current installed Node.js is not in the supported version list (Azure hosting)

 When `Azure` is selected as the hosting type, only LTS versions (v10, v12 and v14) of Node.js are supported by TeamsFx currently, please make sure the installed Node.js meets this requirement. In addition, **Node v14 (LTS)** would be recommended to be installed.

**NOTE**: Please restart all your Visual Studio Code instances after the installation is finished.

## Current installed Node.js is not in the supported version list (SPFx hosting)
  
 The SharePoint Framework v1.12.1 is supported on the following Node.js versions:

 - Node.js v10.13.0+ (Dubnium)
 - Node.js v12.13.0+ (Erbium)
 - Node.js v14.15.0+ (Fermium) 
 
 And **the latest version of Node.js LTS v14** would be recommended to be installed.
 
 Details can see: https://docs.microsoft.com/en-us/sharepoint/dev/spfx/set-up-your-development-environment#install-nodejs

**NOTE**: Please restart all your Visual Studio Code instances after the installation is finished.

## Why .NET SDK is needed?

The `.NET SDK` is used to
* install customized bindings for Azure Functions app during local debugging and its deployments. 
* start the simpleAuth service during local debugging.

## Failed to install .NET Core SDK (v3.1)

### Possible reasons
* Timeout(longer than 3 minutes) to install it caused by poor network.
* The process to install `.NET Core SDK` is killed by mistake.

### Workaround solutions
* Retry it (Type `F5` again).
* Install the `.NET SDK` manually: please go to https://dotnet.microsoft.com/download, and install it on your platform. Both `.NET 5.0 SDK` and `.NET Core 3.1 SDK` are supported.

**NOTE**: Please restart all your Visual Studio Code instances after the installation is finished.

## (Linux only) The toolkit cannot find `.NET 5` or `.NET Core 3.1` on your machine. Please install it manually.

Install the `.NET SDK` manually: please refer to the official documentation to check how to install it: https://docs.microsoft.com/en-us/dotnet/core/install/linux.

**NOTE**: Please restart all your Visual Studio Code instances after the installation is finished.

## Report issues if above FAQ can't solve your problems

Please click [here](https://github.com/OfficeDev/TeamsFx/issues/new) to submit an issue on GitHub and attach the log from Visual Studio Code output channel named "Teams Toolkit".
