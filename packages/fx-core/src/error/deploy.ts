import { UserError } from "@microsoft/teamsfx-api";
import { getDefaultString, getLocalizedString } from "../common/localizeUtils";

export class DeployEmptyFolderError extends UserError {
  constructor(folderPath: string) {
    super({
      source: "azureDeploy",
      message: getDefaultString("error.deploy.DeployEmptyFolderError", folderPath),
      displayMessage: getLocalizedString("error.deploy.DeployEmptyFolderError", folderPath),
    });
  }
}

export class CheckDeploymentStatusTimeoutError extends UserError {
  constructor(helpLink?: string) {
    super({
      source: "azureDeploy",
      message: getDefaultString("error.deploy.CheckDeploymentStatusTimeoutError"),
      displayMessage: getLocalizedString("error.deploy.CheckDeploymentStatusTimeoutError"),
      helpLink: helpLink,
    });
  }
}

export class GetPublishingCredentialsError extends UserError {
  constructor(appName: string, resourceGroup: string, error: Error, helpLink?: string) {
    super({
      source: "azureDeploy",
      message: getDefaultString(
        "error.deploy.GetPublishingCredentialsError",
        appName,
        resourceGroup,
        JSON.stringify(error) || "",
        "https://learn.microsoft.com/en-us/rest/api/appservice/web-apps/list-publishing-credentials#code-try-0"
      ),
      displayMessage: getLocalizedString(
        "error.deploy.GetPublishingCredentialsError.Notification",
        appName,
        resourceGroup
      ),
      helpLink: helpLink,
    });
  }
}

export class DeployZipFileError extends UserError {
  constructor(endpoint: string, error: Error, helpLink?: string) {
    super({
      source: "azureDeploy",
      message: getDefaultString(
        "error.deploy.DeployZipFileError",
        endpoint,
        JSON.stringify(error) || "",
        "https://learn.microsoft.com/en-us/azure/app-service/deploy-zip?tabs=cli"
      ),
      displayMessage: getLocalizedString("error.deploy.DeployZipFileError.Notification", endpoint),
      helpLink: helpLink,
    });
  }
}
