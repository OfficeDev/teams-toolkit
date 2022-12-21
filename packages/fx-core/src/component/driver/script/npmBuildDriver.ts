// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { BaseBuildDriver } from "./baseBuildDriver";
import { Service } from "typedi";
import { DriverContext } from "../interface/commonArgs";
import { FxError, LogProvider, Result, TelemetryReporter } from "@microsoft/teamsfx-api";
import { hooks } from "@feathersjs/hooks";
import { addStartAndEndTelemetry } from "../middleware/addStartAndEndTelemetry";
import { TelemetryConstant } from "../../constant/commonConstant";
import { BaseBuildStepDriver } from "./baseBuildStepDriver";
import { getLocalizedString } from "../../../common/localizeUtils";
import * as path from "path";
import * as fs from "fs-extra";

const ACTION_NAME = "cli/runNpmCommand";

@Service(ACTION_NAME)
export class NpmBuildDriver extends BaseBuildStepDriver {
  readonly description: string = getLocalizedString("driver.script.npmDescription");

  getImpl(args: unknown, context: DriverContext): BaseBuildDriver {
    return new NpmBuildDriverImpl(
      args,
      context,
      "https://aka.ms/teamsfx-actions/cli-run-npm-command"
    );
  }

  @hooks([addStartAndEndTelemetry(ACTION_NAME, TelemetryConstant.DEPLOY_COMPONENT_NAME)])
  async run(args: unknown, context: DriverContext): Promise<Result<Map<string, string>, FxError>> {
    return super.run(args, context);
  }
}

export class NpmBuildDriverImpl extends BaseBuildDriver {
  static readonly TELEMETRY_PACKAGES = new Set([
    "@microsoft/teamsfx",
    "@microsoft/teamsfx-api",
    "@microsoft/teamsfx-js",
    "@microsoft/teamsfx-react",
  ]);
  buildPrefix = "npm";

  async run(): Promise<Map<string, string>> {
    const res = super.run();
    // telemetry for package version
    await NpmBuildDriverImpl.telemetryForPackageVersion(
      this.workingDirectory,
      this.telemetryReporter,
      this.logProvider
    );
    return res;
  }

  static async telemetryForPackageVersion(
    workingDirectory: string,
    telemetryReporter?: TelemetryReporter,
    logProvider?: LogProvider
  ): Promise<void> {
    try {
      const packageJson = path.join(workingDirectory, "package.json");
      if (fs.existsSync(packageJson)) {
        const json = await fs.readJSON(packageJson);
        const dependencies: { [key: string]: string } = {};
        Object.entries({
          ...json.dependencies,
          ...json.devDependencies,
        })
          .filter((entry) => NpmBuildDriverImpl.TELEMETRY_PACKAGES.has(entry[0]))
          .forEach((entry) => {
            dependencies[entry[0]] = entry[1] as string;
          });
        telemetryReporter?.sendTelemetryEvent("package-version", dependencies);
      }
    } catch (e) {
      logProvider?.debug(`Failed to get package version: ${e}`);
    }
  }
}
