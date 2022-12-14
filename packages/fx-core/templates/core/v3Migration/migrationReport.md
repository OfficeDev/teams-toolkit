# Teams Toolkit 5.0 Upgrade Summary
## Migration overview

1. Upgrade V2 project to V3 using migrators. 
2. For changes to the file structure in the root path of a project, migrators will:
    1. Generate `teamsfx/` folder and backup `.fx/` folder into it. `teamsfx/` includes `teamsfx/.env.{env}` files, `teamsfx/app.yml` and `teamsfx/app.local.yml`.
       
       Contents of `teamsfx/.env.{env}` are migrated from `.fx/configs` and `.fx/states`.
       
       Contents of `*.yml` are migrated from `./fx/configs/projectSettings.json` and `*.bicep` files from `/templates/azure/`.
    2. Extract `templates/appPackage/` folder, just keeping `resource/` folder and `manifest.template.json`, and put it under the root path.
    3. Renamed and moved `templates/appPakcage/aad.template.json` to `aad.manifest.template.json`, if it is an aad app.
3. After migration, in the root path of a V3 project, there will be `.vscode/`, `appPackage/`, src folders(`bot/`, `tab` or both), `teamsfx/`, `templates/`, `.gitignore`, `aad.manifest.template.json`(if aad app), `package.json`, and other files or folders exist in root path of V2 project.
4. For more detail changes, please refer to [Detail change](#detail-change).

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