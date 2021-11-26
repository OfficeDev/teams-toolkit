# Congratulations! You have successfully upgraded your Teams App project structure

We have updated the configuration files so that your project is compatible with the latest Teams Toolkit features, including using the Infrastructure as Code approach for resource provision with pre-cooked ARM templates tailored to your project and defining multiple environments within the project. Click [here](https://github.com/OfficeDev/TeamsFx/wiki/Upgrade-project-to-use-latest-Toolkit-features#file-structure-change) to learn more about the file structure changes.

## Know about the changes we made
After project upgrade, the new file structure will consist:
* Project configurations for local debug setting, project setting etc.
* Environment specific configurations for AAD, Manifest etc.
* Project level template files including ARM and Manifest templates.
 
## Know what you need to do
Below are the important things you should know about after upgrading your project.

* Execute [provision again if your project contains Bot / Messaging Extension](https://github.com/OfficeDev/TeamsFx/wiki/Upgrade-project-to-use-latest-Toolkit-features#reprovision-bot-project) capability.
* Update properties if your project contains Azure [API Management (APIM) Service](https://github.com/OfficeDev/TeamsFx/wiki/Upgrade-project-to-use-latest-Toolkit-features#customize-apim-service).
* Reset environment variables if you used an [existing AAD app](https://github.com/OfficeDev/TeamsFx/blob/dev/docs/fx-core/using-existing-aad.md#set-necessary-info-in-teamsfx-project).
* Optionally you can connect to an [Azure SQL instance when local debug](https://github.com/OfficeDev/TeamsFx/wiki/Upgrade-project-to-use-latest-Toolkit-features#local-debug-with-sql) your Teams app.
* [Change resource names](https://github.com/OfficeDev/TeamsFx/wiki/Upgrade-project-to-use-latest-Toolkit-features#change-resource-name-when-creating-a-new-environment) when creating a new environment and if you have executed provision before upgrading.

## Learn More
Read the [Wiki Page](https://github.com/OfficeDev/TeamsFx/wiki/Upgrade-project-to-use-latest-Toolkit-features) to learn more about the project upgrade process.
