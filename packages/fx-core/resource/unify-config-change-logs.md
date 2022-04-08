# Congratulations! You have successfully upgraded your Teams App project structure

We have updated the configuration files so that your project is compatible with the latest Teams Toolkit features, including a consistent configuration file schema and a single Teams app manifest template across local and remote enviornments.

## Know about the changes we made
After project upgrade, the new file strcure will consist:
* `localSettings.json` will be updated to `config.local.json` to ensure consistency between local and remote enviroment configuration settings.
* `manifest.local.template.json` and `manifest.remote.template.json` will be merged into a single manifest template file named `manifest.template.json` to make managing manifest template files easy.

Your existing `localSettings.json`, `manifest.local.template.json` and `manifest.remote.template.json` files will be backed up in `.backup` folder.

## Know what you need to do
Since Teams Toolkit will use `manifest.remote.template.json` as single manifest template file after upgrade, if you have customized the `manifest.local.template.json` you will need to place your changes in `config.local.json` and pass it to the template. 

## Know about how to restore your project

* Copy the .backup/.fx folder to your project root path.
* Copy the .backup/templates folder to your project root path.
* Delete ```config.local.json``` and ```manifest.template.json``` if needed.
