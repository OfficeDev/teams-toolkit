// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand, FxError, Result, err, ok } from "@microsoft/teamsfx-api";
import {
  AppStudioScopes,
  CheckerFactory,
  DepsType,
  EmptyLogger,
  EmptyTelemetry,
  assembleError,
  getSideloadingStatus,
} from "@microsoft/teamsfx-core";
import { getFxCore } from "../../../activate";
import * as constants from "../../../cmds/preview/constants";
import { signedOut } from "../../../commonlib/common/constant";
import { logger } from "../../../commonlib/logger";
import M365TokenInstance from "../../../commonlib/m365Login";
import { cliSource } from "../../../constants";
import { TelemetryEvent } from "../../../telemetry/cliTelemetryEvents";

export const teamsappDoctorCommand: CLICommand = {
  name: "doctor",
  description: "Prerequiste checker for building Microsoft Teams apps.",
  options: [],
  telemetry: {
    event: TelemetryEvent.Doctor,
  },
  defaultInteractiveOption: false,
  handler: async (ctx) => {
    getFxCore();
    const res = await checkM365Account();

    if (res.isErr()) {
      return err(res.error);
    } else {
      logger.info(res.value);
    }

    const nodeChecker = CheckerFactory.createChecker(
      DepsType.LtsNode,
      new EmptyLogger(),
      new EmptyTelemetry()
    );
    const nodeRes = await nodeChecker.getInstallationInfo();
    logger.info(JSON.stringify(nodeRes));

    const dotnetChecker = CheckerFactory.createChecker(
      DepsType.Dotnet,
      new EmptyLogger(),
      new EmptyTelemetry()
    );
    const dotnetRes = await dotnetChecker.getInstallationInfo();
    logger.info(JSON.stringify(dotnetRes));
    return ok(undefined);
  },
};

async function checkM365Account(): Promise<Result<string, FxError>> {
  let result = true;
  let summaryMsg = "";
  let error = undefined;
  let loginHint: string | undefined = undefined;
  try {
    let loginStatusRes = await M365TokenInstance.getStatus({ scopes: AppStudioScopes });
    let token = loginStatusRes.isOk() ? loginStatusRes.value.token : undefined;
    if (loginStatusRes.isOk() && loginStatusRes.value.status === signedOut) {
      const tokenRes = await M365TokenInstance.getAccessToken({
        scopes: AppStudioScopes,
        showDialog: true,
      });
      token = tokenRes.isOk() ? tokenRes.value : undefined;
      loginStatusRes = await M365TokenInstance.getStatus({ scopes: AppStudioScopes });
    }
    if (token === undefined) {
      result = false;
      summaryMsg = constants.doctorResult.NotSignIn;
    } else {
      const isSideloadingEnabled = await getSideloadingStatus(token);
      if (isSideloadingEnabled === false) {
        // sideloading disabled
        result = false;
        summaryMsg = constants.doctorResult.SideLoadingDisabled;
      }
    }
    const tokenObject = loginStatusRes.isOk() ? loginStatusRes.value.accountInfo : undefined;
    if (tokenObject && tokenObject.upn) {
      loginHint = tokenObject.upn as string;
    }
  } catch (err: any) {
    result = false;
    error = assembleError(err, cliSource);
    return err(error);
  }
  if (result && loginHint) {
    summaryMsg = constants.doctorResult.SignInSuccess.split("@account").join(`${loginHint}`);
  }
  return ok(summaryMsg);
}
