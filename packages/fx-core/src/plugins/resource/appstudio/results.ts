import { SystemError, UserError } from "@microsoft/teamsfx-api";
import { Constants } from "./constants";

export class AppStudioResultFactory {
  static readonly defaultHelpLink = "";
  static readonly defaultIssueLink = "";

  public static UserError(
    name: string,
    message: string,
    helpLink?: string,
    stack?: string,
    innerError?: any
  ): UserError {
    return new UserError(name, message, Constants.PLUGIN_NAME, stack, helpLink, innerError);
  }

  public static SystemError(
    name: string,
    message: string,
    innerError?: any,
    stack?: string,
    issueLink?: string
  ): SystemError {
    return new SystemError(name, message, Constants.PLUGIN_NAME, stack, issueLink, innerError);
  }
}
