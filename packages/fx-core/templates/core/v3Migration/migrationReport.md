# Teams Toolkit 5.0 Upgrade Summary
## Migration overview

## Detail change

1. Moved `templates/appPackage/resource` and `templates/appPackage/manifest.template.json` into the `appPackage` folder.
1. Renamed and moved `templates/appPakcage/aad.template.json` to `aad.manifest.template.json`.
1. Updated placeholders in `appPackage/manifest.template.json` and `aad.manifest.template.json`.
1. Updated `webApplicationInfo.resource` in `appPackage/manifest.template.json`.
1. Updated `identifierUris` in `aad.manifest.template.json`.
1. Moved `.fx/configs/azure.parameter.{env}.json` into the `templates/azure` folder
1. Updated placeholders in azure parameter files 
1. Created missing `.env.{env}` files in the `teamsfx` folder.
1. Moved contents of `.fx/configs/config.{env}.json` into the respective `.env.{env}` file.
1. Moved contents of `.fx/states/state.{env}.json` into the respective `.env.{env}` file, except for `fx-resource-aad-app-for-teams.clientSecret`, `fx-resource-bot.botPassword`, `fx-resource-apim.apimClientAADClientSecret`, and `fx-resource-azure-sql.adminPassword`.
1. Moved contents of `.fx/states/userdata.{env}` into the respective `.env.{env}` file.
1. Copied the `.fx`, `.vscode`, and `templates` folders into the `teamsfx/backup` folder.