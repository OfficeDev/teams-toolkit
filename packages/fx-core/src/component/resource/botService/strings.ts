// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { getLocalizedString } from "../../../common/localizeUtils";

export class CommonStrings {
  public static readonly APP_STUDIO_BOT_REGISTRATION = getLocalizedString(
    "plugins.bot.AppStudioBotRegistration"
  );
}

export class ConfigNames {
  public static readonly APPSTUDIO_TOKEN = "app studio token";

  public static readonly MESSAGE_ENDPOINT = "message endpoint";
}
