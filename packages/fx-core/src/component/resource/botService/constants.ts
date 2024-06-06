// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { APP_STUDIO_API_NAMES } from "../../driver/teamsApp/constants";

/**
 * @author Qianhao Dong <qidon@microsoft.com>
 */
export class Retry {
  public static readonly RETRY_TIMES = 6;
  public static readonly BACKOFF_TIME_MS = 5000;
}

export class ErrorNames {
  // System Exceptions
  public static readonly PRECONDITION_ERROR = "PreconditionError";
  public static readonly PROVISION_ERROR = "ProvisionError";
  public static readonly CONFIG_UPDATING_ERROR = "ConfigUpdatingError";
  public static readonly CONFIG_VALIDATION_ERROR = "ConfigValidationError";
  public static readonly BOT_REGISTRATION_NOTFOUND_ERROR = "BotRegistrationNotFoundError";
  public static readonly MSG_ENDPOINT_UPDATING_ERROR = "MessageEndpointUpdatingError";
  public static readonly COMMAND_EXECUTION_ERROR = "CommandExecutionError";
  public static readonly CALL_APPSTUDIO_API_ERROR = "CallAppStudioAPIError";
  public static readonly CREATE_BOT_REGISTRATION_API_ERROR = "CreateBotRegistrationApiError";

  // User Exceptions
  public static readonly PACK_DIR_EXISTENCE_ERROR = "PackDirectoryExistenceError";
  public static readonly ACQUIRE_BOT_FRAMEWORK_TOKEN_ERROR = "AcquireBotFrameworkTokenError";
  public static readonly FORBIDDEN_RESULT_BOT_FRAMEWORK_ERROR = "ForbiddenResultBotFrameworkError";
  public static readonly CONFLICT_RESULT_BOT_FRAMEWORK_ERROR = "ConflictResultBotFrameworkError";
}

export const TeamsFxUrlNames: { [index: string]: string } = {
  [APP_STUDIO_API_NAMES.CREATE_BOT]: "<create-bot-registration>",
  [APP_STUDIO_API_NAMES.GET_BOT]: "<get-bot-registration>",
  [APP_STUDIO_API_NAMES.UPDATE_BOT]: "<update-message-endpoint>",
};
