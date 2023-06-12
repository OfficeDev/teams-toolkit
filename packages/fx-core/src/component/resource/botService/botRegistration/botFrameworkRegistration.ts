// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan He <ruhe@microsoft.com>
 */
import { IBotRegistration } from "../appStudio/interfaces/IBotRegistration";
import { err, FxError, Result, ok, M365TokenProvider } from "@microsoft/teamsfx-api";
import { AppStudioScopes } from "../../../../common/tools";
import { AppStudioClient } from "../appStudio/appStudioClient";
import { Utils } from "./utils";

export async function createOrUpdateBotRegistration(
  m365TokenProvider: M365TokenProvider,
  botRegistration: IBotRegistration
): Promise<Result<boolean, FxError>> {
  // 1. Get bot registration from remote.
  // 2. If Not Found, Then create a new bot registration.
  // 3. Else:
  //      3.1 Merge bot registration (remote + passed-in, respect passed-in).
  //      3.2 Update bot registration.
  const appStudioTokenRes = await m365TokenProvider.getAccessToken({
    scopes: AppStudioScopes,
  });
  if (appStudioTokenRes.isErr()) {
    return err(appStudioTokenRes.error);
  }
  const appStudioToken = appStudioTokenRes.value;
  const remoteBotRegistration = await AppStudioClient.getBotRegistration(
    appStudioToken,
    botRegistration.botId!
  );
  if (!remoteBotRegistration) {
    // Not Found case.
    await AppStudioClient.createBotRegistration(appStudioToken, botRegistration, false);
  } else {
    // Update bot registration.
    const mergedBotRegistration = Utils.mergeIBotRegistration(
      botRegistration,
      remoteBotRegistration
    );
    await AppStudioClient.updateBotRegistration(appStudioToken, mergedBotRegistration);
  }
  return ok(remoteBotRegistration !== undefined);
}
