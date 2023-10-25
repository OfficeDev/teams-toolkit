// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand, FxError, Result, ok } from "@microsoft/teamsfx-api";
import {
  AppStudioScopes,
  CheckerFactory,
  DepsType,
  EmptyLogger,
  EmptyTelemetry,
  FuncToolChecker,
  LocalCertificateManager,
  assembleError,
  getSideloadingStatus,
} from "@microsoft/teamsfx-core";
import { getFxCore } from "../../../activate";
// import * as constants from "../../../cmds/preview/constants";
import * as util from "util";
import { DoneText, TextType, WarningText, colorize } from "../../../colorize";
import { signedOut } from "../../../commonlib/common/constant";
import { logger } from "../../../commonlib/logger";
import M365TokenInstance from "../../../commonlib/m365Login";
import { cliSource } from "../../../constants";
import { strings } from "../../../resource";
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

    // const progress = userInteraction.createProgressBar(
    //   "Teams Toolkit is checking the required prerequisites.",
    //   5
    // );

    // await progress.start();

    // await progress.next("(1/4) Checking Microsoft 365 Account ...");
    const res = await checkM365Account();
    if (res.isErr()) {
      logger.error(res.error.message);
    } else {
      logger.info(res.value);
    }
    // await progress.next("(2/4) Checking Node.js ...");
    const nodeChecker = CheckerFactory.createChecker(
      DepsType.LtsNode,
      new EmptyLogger(),
      new EmptyTelemetry()
    );
    const nodeRes = await nodeChecker.getInstallationInfo();
    if (nodeRes.isInstalled) {
      if (nodeRes.error) {
        logger.info(
          WarningText +
            util.format(
              strings.command.doctor.node.NotSupported,
              nodeRes.details.installVersion!,
              nodeRes.details.supportedVersions.join(", ")
            )
        );
      } else {
        logger.info(
          DoneText +
            util.format(strings.command.doctor.node.Success, nodeRes.details.installVersion!)
        );
      }
    } else {
      logger.info(WarningText + strings.command.doctor.node.NotFound);
    }
    // await progress.next("(3/5) Checking .NET Core SDK ...");
    // const dotnetChecker = CheckerFactory.createChecker(
    //   DepsType.Dotnet,
    //   new EmptyLogger(),
    //   new EmptyTelemetry()
    // );
    // const dotnetRes = await dotnetChecker.getInstallationInfo();
    // if (dotnetRes.isInstalled) {
    //   if (dotnetRes.error) {
    //     logger.info(
    //       WarningText +
    //         util.format(
    //           strings.command.doctor.dotnet.NotSupported,
    //           dotnetRes.details.installVersion!,
    //           dotnetRes.details.supportedVersions.join(", ")
    //         )
    //     );
    //   } else {
    //     logger.info(
    //       DoneText +
    //         util.format(strings.command.doctor.dotnet.Success, nodeRes.details.installVersion!)
    //     );
    //   }
    // } else {
    //   logger.info(
    //     WarningText +
    //       util.format(
    //         strings.command.doctor.dotnet.NotFound,
    //         colorize(dotnetExplanationHelpLink, TextType.Hyperlink)
    //       )
    //   );
    // }
    // await progress.next("(3/4) Azure Functions Core Tools ...");
    const funcChecker = new FuncToolChecker();
    try {
      const funcRes = await funcChecker.queryFuncVersion(undefined);
      logger.info(DoneText + util.format(strings.command.doctor.func.Success, funcRes.versionStr));
    } catch (e) {
      logger.info(WarningText + strings.command.doctor.func.NotFound);
    }

    // await progress.next("(4/4) Local Certificate ...");

    const certManager = new LocalCertificateManager();
    const certRes = await certManager.setupCertificate(true, true);

    if (!certRes.found) {
      logger.info(WarningText + strings.command.doctor.cert.NotFound);
    } else {
      if (certRes.alreadyTrusted) {
        logger.info(DoneText + strings.command.doctor.cert.NotFound);
      } else {
        logger.info(WarningText + strings.command.doctor.cert.FoundNotTrust);
      }
    }

    // await progress.end(true);

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
      summaryMsg = WarningText + strings.command.doctor.account.NotSignIn;
    } else {
      const isSideloadingEnabled = await getSideloadingStatus(token);
      if (isSideloadingEnabled === false) {
        // sideloading disabled
        result = false;
        summaryMsg = WarningText + strings.command.doctor.account.SideLoadingDisabled;
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
    summaryMsg =
      DoneText +
      util.format(
        strings.command.doctor.account.SignInSuccess,
        colorize(loginHint, TextType.Email)
      );
  }
  return ok(summaryMsg);
}
