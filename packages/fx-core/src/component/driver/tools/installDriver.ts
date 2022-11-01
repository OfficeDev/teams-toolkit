// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Service } from "typedi";
import { hooks } from "@feathersjs/hooks/lib";
import { FxError, Result } from "@microsoft/teamsfx-api";
import { LocalCertificateManager } from "../../../common/local/localCertificateManager";
import { TelemetryConstant } from "../../constant/commonConstant";
import { wrapRun } from "../../utils/common";
import { DriverContext } from "../interface/commonArgs";
import { StepDriver } from "../interface/stepDriver";
import { addStartAndEndTelemetry } from "../middleware/addStartAndEndTelemetry";
import { InvalidParameterUserError } from "./error/invalidParameterUserError";
import { InstallToolArgs } from "./interfaces/InstallToolArgs";

const ACTION_NAME = "tools/install";
const outputName = Object.freeze({
  SSL_CRT_FILE: "SSL_CRT_FILE",
  SSL_KEY_FILE: "SSL_KEY_FILE",
});
const helpLink = "https://aka.ms/teamsfx-actions/tools/install";

@Service(ACTION_NAME)
export class ToolsInstallDriver implements StepDriver {
  @hooks([addStartAndEndTelemetry(ACTION_NAME, TelemetryConstant.DEPLOY_COMPONENT_NAME)])
  async run(
    args: InstallToolArgs,
    context: DriverContext
  ): Promise<Result<Map<string, string>, FxError>> {
    const impl = new ToolsInstallDriverImpl(context);
    return wrapRun(() => impl.run(args));
  }
}

export class ToolsInstallDriverImpl {
  progressBarName = `Installing tools`;
  progressBarSteps = 2;

  constructor(private context: DriverContext) {}

  async run(args: InstallToolArgs): Promise<Map<string, string>> {
    // TODO(xiaofhua): prettier output
    this.context.logProvider.info(`Running '${ACTION_NAME}' driver.`);
    const res = new Map<string, string>();
    this.validateArgs(args);
    if (args.devCert) {
      const localCertRes = await this.resolveLocalCertificate(args.devCert.trust);
      localCertRes.forEach((v, k) => res.set(k, v));
    }

    // TODO(xiaofhua): prettier output
    this.context.logProvider.info(`Run '${ACTION_NAME}' driver successfully.`);
    return res;
  }

  // TODO(xiaofhua): add dev cert status telemetry
  async resolveLocalCertificate(trustDevCert: boolean): Promise<Map<string, string>> {
    const res = new Map<string, string>();
    // Do not print any log in LocalCertificateManager, use the error message returned instead.
    const certManager = new LocalCertificateManager(this.context.ui);
    const localCertResult = await certManager.setupCertificate(trustDevCert);
    if (trustDevCert) {
      res.set(outputName.SSL_CRT_FILE, localCertResult.certPath);
      res.set(outputName.SSL_KEY_FILE, localCertResult.keyPath);
    }

    if (typeof localCertResult.isTrusted === "undefined") {
      // TODO(xiaofhua): prettier warning output
      this.context.logProvider.warning("Skip trusting development certificate for localhost.");
    } else if (localCertResult.isTrusted === false) {
      throw localCertResult.error;
    }
    return res;
  }

  private validateArgs(args: InstallToolArgs): void {
    if (!!args.devCert && typeof args.devCert?.trust !== "boolean") {
      throw new InvalidParameterUserError(ACTION_NAME, "devCert.trust", helpLink);
    }
  }
}
