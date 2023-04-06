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
        JSON.stringify(error) || ""
      ),
      displayMessage: getLocalizedString(
        "error.deploy.GetPublishingCredentialsError",
        appName,
        resourceGroup,
        error.message || ""
      ),
      helpLink: helpLink,
    });
  }
}
