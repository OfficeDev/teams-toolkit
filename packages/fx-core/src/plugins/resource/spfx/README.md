# Project

> This repo is a sample TeamsFx plugin of SFPx

## Requirements

- node = 12.x.x

Suggest a node version managerment softwate if you want to switch different node versions in your machine: https://github.com/coreybutler/nvm-windows

Loopup current version:

```
nvm list
```

Select one version:

```
nvm use 12.x
```

## How to use this plugin

1. Open command palette: "TeamsFx: Start A New Project".
2. Select "tab".
3. Select "SharePointFramework, version: 0.1.0".
4. Input webpart name.
5. Input webpart description.
6. Select "none" or "react" as frontend framework.
7. Select the root folder from where your project will be created in.
8. After scafolding, open a terminal and execute: "cd SPFx npm install" to install the depedended plugin
9. Open command palette: "TeamsFx: Deploy Package"
10. SPFx plugin will automatically build the project, upload the bundled SPFx package to SharePoint App Catalog.
11. Open SharePoint App Catalog, and click `Sync to Teams`. Confirm that you can see the status message `Successfully synced teams solution` on the top-right corner.
12. Open Teams Client, you can see the teams app now.

## Contributing

This project welcomes contributions and suggestions. Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit https://cla.opensource.microsoft.com.

When you submit a pull request, a CLA bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., status check, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

## Trademarks

This project may contain trademarks or logos for projects, products, or services. Authorized use of Microsoft
trademarks or logos is subject to and must follow
[Microsoft's Trademark & Brand Guidelines](https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks/usage/general).
Use of Microsoft trademarks or logos in modified versions of this project must not cause confusion or imply Microsoft sponsorship.
Any use of third-party trademarks or logos are subject to those third-party's policies.
