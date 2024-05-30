// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import M365TokenInstance from "../commonlib/m365Login";
import { signedIn } from "../commonlib/common/constant";
import * as localizeUtils from "../utils/localizeUtils";
import VsCodeLogInstance from "../commonlib/log";
import * as handlerBase from "../handlers";

import * as vscode from "vscode";
import { FxError, Result, err, ok } from "@microsoft/teamsfx-api";
import * as core from "@microsoft/teamsfx-core";
import { PackageService } from "@microsoft/teamsfx-core";

export async function checkCopilotAccessHandler(): Promise<Result<null, FxError>> {
  // check m365 login status, if not logged in, pop up a message
  const status = await M365TokenInstance.getStatus({ scopes: core.AppStudioScopes });
  if (!(status.isOk() && status.value.status === signedIn)) {
    const message = localizeUtils.localize("teamstoolkit.m365.needSignIn.message");
    const signin = localizeUtils.localize("teamstoolkit.common.signin");
    const userSelected = await vscode.window.showInformationMessage(
      message,
      { modal: false },
      signin
    );

    // user may cancel the follow.
    if (userSelected) {
      try {
        await handlerBase.signInM365();
      } catch (e) {
        return Promise.resolve(handlerBase.wrapError(e as Error));
      }
    }
  }

  // if logged in, check copilot access with a different scopes
  const copilotCheckServiceScope = process.env.SIDELOADING_SERVICE_SCOPE ?? core.serviceScope;
  const copilotTokenRes = await M365TokenInstance.getAccessToken({
    scopes: [copilotCheckServiceScope],
  });
  if (copilotTokenRes.isOk()) {
    const hasCopilotAccess = await PackageService.GetSharedInstance().getCopilotStatus(
      copilotTokenRes.value,
      false
    );
    if (hasCopilotAccess) {
      VsCodeLogInstance.semLog({
        content: "Your Microsoft 365 account has Copilot access enabled",
        status: core.SummaryConstant.Succeeded,
      });
    } else {
      VsCodeLogInstance.semLog([
        {
          content:
            "Microsoft 365 account administrator hasn't enabled Copilot access for this account",
          status: core.SummaryConstant.Failed,
        },
        {
          content:
            "Contact Your Teams administrator to resolve this issue by enrolling in Microsoft 365 Copilot Early Access program(https://learn.microsoft.com/en-us/microsoft-365-copilot/extensibility/prerequisites#prerequisites)",
        },
      ]);
    }
  } else {
    return Promise.resolve(err(copilotTokenRes.error));
  }

  return Promise.resolve(ok(null));
}
