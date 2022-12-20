# Upgrade Summary
## Migration overview

1. Upgraded projects to use Teams Toolkit version >= 5.0.0. 
2. For changes to the file structure in the root path of a project, migrators:
   * Moved everything in `.fx` to `teamsfx` folder with new file format.
   * Moved `templates/appPackage` to `./appPackage` per latest tooling's requirement.
   * Moved `templates/appPackage/aad.template.json` to `./aad.manifest.template.json` per latest tooling's requirement.
4. For more detail changes, please refer to [this wiki](https://aka.ms/teams-toolkit-5.0-upgrade).