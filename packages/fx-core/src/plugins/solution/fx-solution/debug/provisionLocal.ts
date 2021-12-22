// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import {
  err,
  FxError,
  Inputs,
  Json,
  ok,
  Platform,
  Result,
  v2,
  Void,
  VsCodeEnv,
} from "@microsoft/teamsfx-api";
import { ProjectSettingsHelper } from "../../../../common/local/projectSettingsHelper";
import { TelemetryEventName, TelemetryUtils } from "./util/telemetry";
import {
  InvalidLocalBotEndpointFormat,
  LocalBotEndpointNotConfigured,
  SetupLocalDebugSettingsError,
  NgrokTunnelNotConnected,
} from "./error";
import { getCodespaceName, getCodespaceUrl } from "./util/codespace";
import { getNgrokHttpUrl } from "./util/ngrok";

export async function setupLocalDebugSettings(
  ctx: v2.Context,
  inputs: Inputs,
  localSettings: Json
): Promise<Result<Void, FxError>> {
  const vscEnv = inputs.vscodeEnv;
  const includeFrontend = ProjectSettingsHelper.includeFrontend(ctx.projectSetting);
  const includeBackend = ProjectSettingsHelper.includeBackend(ctx.projectSetting);
  const includeBot = ProjectSettingsHelper.includeBot(ctx.projectSetting);
  const includeAuth = ProjectSettingsHelper.includeAuth(ctx.projectSetting);
  let skipNgrok = localSettings?.bot?.skipNgrok as boolean;

  const telemetryProperties = {
    platform: inputs.platform as string,
    vscenv: vscEnv as string,
    frontend: includeFrontend ? "true" : "false",
    function: includeBackend ? "true" : "false",
    bot: includeBot ? "true" : "false",
    auth: includeAuth ? "true" : "false",
    "skip-ngrok": skipNgrok ? "true" : "false",
  };
  TelemetryUtils.init(ctx);
  TelemetryUtils.sendStartEvent(TelemetryEventName.setupLocalDebugSettings, telemetryProperties);

  try {
    // setup configs used by other plugins
    // TODO: dynamicly determine local ports
    if (inputs.platform === Platform.VSCode || inputs.platform === Platform.CLI) {
      let localTabEndpoint: string;
      let localTabDomain: string;
      let localAuthEndpoint: string;
      let localFuncEndpoint: string;

      if (vscEnv === VsCodeEnv.codespaceBrowser || vscEnv === VsCodeEnv.codespaceVsCode) {
        const codespaceName = await getCodespaceName();

        localTabEndpoint = getCodespaceUrl(codespaceName, 3000);
        localTabDomain = new URL(localTabEndpoint).host;
        localAuthEndpoint = getCodespaceUrl(codespaceName, 5000);
        localFuncEndpoint = getCodespaceUrl(codespaceName, 7071);
      } else {
        localTabDomain = "localhost";
        localTabEndpoint = "https://localhost:3000";
        localAuthEndpoint = "http://localhost:5000";
        localFuncEndpoint = "http://localhost:7071";
      }

      if (includeAuth) {
        localSettings.auth.AuthServiceEndpoint = localAuthEndpoint;
      }

      if (includeFrontend) {
        localSettings.frontend.tabEndpoint = localTabEndpoint;
        localSettings.frontend.tabDomain = localTabDomain;
      }

      if (includeBackend) {
        localSettings.backend.functionEndpoint = localFuncEndpoint;
      }

      if (includeBot) {
        if (skipNgrok === undefined) {
          skipNgrok = false;
          localSettings.bot.skipNgrok = skipNgrok;
        }

        if (skipNgrok) {
          const localBotEndpoint = localSettings.bot.botEndpoint as string;
          if (localBotEndpoint === undefined) {
            const error = LocalBotEndpointNotConfigured();
            TelemetryUtils.sendErrorEvent(TelemetryEventName.setupLocalDebugSettings, error);
            return err(error);
          }

          const botEndpointRegex = /https:\/\/.*(:\d+)?/g;
          if (!botEndpointRegex.test(localBotEndpoint)) {
            const error = InvalidLocalBotEndpointFormat(localBotEndpoint);
            TelemetryUtils.sendErrorEvent(TelemetryEventName.setupLocalDebugSettings, error);
            return err(error);
          }

          localSettings.bot.botEndpoint = localBotEndpoint;
          localSettings.bot.botDomain = localBotEndpoint.slice(8);
        } else {
          const ngrokHttpUrl = await getNgrokHttpUrl(3978);
          if (!ngrokHttpUrl) {
            const error = NgrokTunnelNotConnected();
            TelemetryUtils.sendErrorEvent(TelemetryEventName.setupLocalDebugSettings, error);
            return err(error);
          } else {
            localSettings.bot.botEndpoint = ngrokHttpUrl;
            localSettings.bot.botDomain = ngrokHttpUrl.slice(8);
          }
        }
      }
    }
  } catch (error: any) {
    const systemError = SetupLocalDebugSettingsError(error);
    TelemetryUtils.sendErrorEvent(TelemetryEventName.setupLocalDebugSettings, systemError);
    return err(systemError);
  }
  TelemetryUtils.sendSuccessEvent(TelemetryEventName.setupLocalDebugSettings, telemetryProperties);
  return ok(Void);
}
