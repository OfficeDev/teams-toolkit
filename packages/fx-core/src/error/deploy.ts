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

export class DeployZipPackageError extends UserError {
  constructor(endpoint: string, error: Error, helpLink?: string) {
    super({
      source: "azureDeploy",
      message: getDefaultString(
        "error.deploy.DeployZipPackageError",
        endpoint,
        JSON.stringify(error) || "",
        "https://learn.microsoft.com/azure/app-service/deploy-zip?tabs=cli"
      ),
      displayMessage: getLocalizedString(
        "error.deploy.DeployZipPackageError.Notification",
        endpoint
      ),
      helpLink: helpLink,
    });
  }
}

export class CheckDeployStatusError extends UserError {
  constructor(location: string, error: Error, helpLink?: string) {
    super({
      source: "azureDeploy",
      message: getDefaultString(
        "error.deploy.CheckDeployStatusError",
        location,
        JSON.stringify(error) || ""
      ),
      displayMessage: getLocalizedString(
        "error.deploy.CheckDeployStatusError",
        location,
        error.message || ""
      ),
      helpLink: helpLink,
    });
  }
}

export class DeployRemoteStartError extends UserError {
  constructor(location: string, errorMessage: string, helpLink?: string) {
    super({
      source: "azureDeploy",
      message: getDefaultString("error.deploy.DeployRemoteStartError", location, errorMessage),
      displayMessage: getLocalizedString("error.deploy.DeployRemoteStartError", location),
      helpLink: helpLink,
    });
  }
}
