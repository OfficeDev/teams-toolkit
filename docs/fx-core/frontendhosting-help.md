## FE.StaticWebsiteDisableError
### Error Message
Static website hosting feature is disabled for Azure Storage Account.
### Mitigation
To host the tab front-end code in Azure Storage Account, you need to enable the static website feature. You can simply re-run the `Teams: Provision in the cloud` command and the toolkit automatically enables the feature. If you use CLI, try `teamsfx provision`. To manually enable this feature, see [here](https://docs.microsoft.com/en-us/azure/storage/blobs/storage-blob-static-website-how-to?tabs=azure-portal#enable-static-website-hosting)

## FE.EnableStaticWebsiteError
### Error Message
Failed to enable static website feature for Azure Storage Account.
### Mitigation
Toolkit failed to enable static website feature for your Azure Storage Account. You can manually enable it.

1. Find your Azure Storage Account. You can find your Azure Resource Group name and Azure Storage Account name in **.fx/states/state.{envName}.json** file by searching the keyword **resourceGroupName** and **storageName**.
2. Follow the [document](https://docs.microsoft.com/en-us/azure/storage/blobs/storage-blob-static-website-how-to?tabs=azure-portal#enable-static-website-hosting) to enable static website feature.
