# Congratulations! You have successfully upgraded your Teams App project structure.

We have updated the configuration files so that your project is compatible with the latest Teams Toolkit features, including a consistent configuration file schema and a single Teams app manifest template across local and remote environments.

> Important Notes: If you collaborate on this project with your co-workers, please ensure your team members update the Teams Toolkit extension to the latest version after committing the changes with this upgrade.

## Why upgrade
Teams Toolkit continues to improve your Teams application development experience. We are upgrading the Teams app project structure so that you can:
1. Use a consistent schema to manage configuration settings for local and remote environments.
1. Use a single Teams application manifest template across local and remote environments.

## Know about the changes we made
After the project upgrade, the new file structure will consist:
* `localSettings.json` will be updated to `config.local.json` to ensure consistency between local and remote environment configuration settings.
* `manifest.local.template.json` and `manifest.remote.template.json` will be merged into a single manifest template file named `manifest.template.json` to make managing manifest template files easy.

Your existing `localSettings.json`, `manifest.local.template.json`, and `manifest.remote.template.json` files will be backed up in `.backup` folder.

## Know what you need to do
Since Teams Toolkit will use `manifest.remote.template.json` as a single manifest template file after the upgrade, if you have customized the `manifest.local.template.json`, you will need to update the `manifest.template.json` to include your change.

For how to update the `manifest.template.json`, you can check this [Wiki Page](https://aka.ms/teamsfx-unify-local-remote-manifest-guide).

## Know about how to restore your project
If anything went wrong after the upgrade process, you could restore your old project configuration files by:
* Copy the .backup/.fx folder to your project root path.
* Copy the .backup/templates folder to your project root path.
* Delete `config.local.json` and `manifest.template.json` if needed.
