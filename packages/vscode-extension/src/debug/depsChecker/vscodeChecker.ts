// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { err, ok, Result, Void } from "@microsoft/teamsfx-api";
import {
  defaultHelpLink,
  DependencyStatus,
  DepsCheckerError,
  DepsCheckerEvent,
  DepsLogger,
  DepsManager,
  DepsOptions,
  DepsTelemetry,
  DepsType,
  Messages,
} from "@microsoft/teamsfx-core";
import * as os from "os";
import { vscodeHelper } from "./vscodeHelper";

export class VSCodeDepsChecker {
  private static learnMoreButtonText = "Learn more";

  private readonly depsManager: DepsManager;

  constructor(
    private logger: DepsLogger,
    private telemetry: DepsTelemetry,
    private enableDisplayMessage: boolean = true
  ) {
    this.depsManager = new DepsManager(logger, telemetry);
  }

  private static isLinux(): boolean {
    return os.type() === "Linux";
  }

  public async resolve(deps: DepsType[]): Promise<Result<Void, DepsCheckerError>> {
    const enabledDeps = await this.getEnabledDeps(deps);
    const depsStatus = await this.ensure(enabledDeps);

    const res = await this.handleLinux(depsStatus);
    if (res.isErr()) {
      return res;
    }

    for (const dep of depsStatus) {
      // only one error because of fast fail
      if (!dep.isInstalled && dep.error) {
        await this.logger.error(`${dep.error.message}, error = ${dep.error}`);
        this.logger.cleanup();
        await this.display(dep.error.message, dep.error.helpLink);
        return err(dep.error);
      }
    }
    return ok(Void);
  }

  private async getEnabledDeps(deps: DepsType[]): Promise<DepsType[]> {
    const res: DepsType[] = [];
    for (const dep of deps) {
      if (await this.isEnabled(dep)) {
        res.push(dep);
      }
    }
    return res;
  }

  public async getDepsStatus(dep: DepsType): Promise<DependencyStatus> {
    return (await this.depsManager.getStatus([dep]))[0];
  }

  private async ensure(deps: DepsType[]): Promise<DependencyStatus[]> {
    if (deps.length == 0) {
      return [];
    }
    const options: DepsOptions = { fastFail: true };
    return await this.depsManager.ensureDependencies(deps, options);
  }

  private async handleLinux(
    depsStatus: DependencyStatus[]
  ): Promise<Result<Void, DepsCheckerError>> {
    if (!VSCodeDepsChecker.isLinux()) {
      return ok(Void);
    }
    const manuallyInstallDeps = depsStatus
      .filter((dep) => !dep.isInstalled)
      .filter((dep) => !dep.details.isLinuxSupported);

    if (manuallyInstallDeps.length == 0) {
      return ok(Void);
    }

    const displayMessage = await this.generateLinuxMsg(manuallyInstallDeps);
    await this.display(displayMessage, defaultHelpLink);
    this.logger.cleanup();
    return err(new DepsCheckerError(displayMessage, defaultHelpLink));
  }

  private async generateLinuxMsg(depsStatus: DependencyStatus[]): Promise<string> {
    const supportedPackages = [];
    for (const dep of depsStatus) {
      const supportedVersions = dep.details.supportedVersions
        .map((version) => "v" + version)
        .join(" or ");
      supportedPackages.push(`${dep.name} (${supportedVersions})`);
    }
    const supportedMessage = supportedPackages.join(" and ");
    return Messages.linuxDepsNotFound.split("@SupportedPackages").join(supportedMessage);
  }

  public async display(message: string, link: string): Promise<void> {
    if (!this.enableDisplayMessage) {
      return;
    }

    const clickButton = await vscodeHelper.showWarningMessage(message, {
      title: VSCodeDepsChecker.learnMoreButtonText,
    });
    if (clickButton) {
      this.telemetry.sendEvent(DepsCheckerEvent.clickLearnMore);
      await vscodeHelper.openUrl(link);
      await this.display(message, link);
      return;
    }
    // click cancel button
    this.telemetry.sendEvent(DepsCheckerEvent.clickCancel);
  }

  private async isEnabled(dep: DepsType): Promise<boolean> {
    switch (dep) {
      case DepsType.AzureNode:
      case DepsType.SpfxNode:
        return vscodeHelper.isNodeCheckerEnabled();
      case DepsType.FunctionNode:
        return vscodeHelper.isNodeCheckerEnabled() && (await vscodeHelper.hasFunction());
      case DepsType.Dotnet:
        return vscodeHelper.isDotnetCheckerEnabled();
      case DepsType.FuncCoreTools:
        return vscodeHelper.isFuncCoreToolsEnabled() && (await vscodeHelper.hasFunction());
      case DepsType.Ngrok:
        return (await vscodeHelper.hasBot()) && (await vscodeHelper.hasNgrok());
      default:
        return false;
    }
  }
}
