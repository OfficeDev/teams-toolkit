// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  defaultHelpLink,
  DependencyStatus,
  DepsCheckerEvent,
  DepsLogger,
  DepsManager,
  DepsOptions,
  DepsTelemetry,
  DepsType,
  Messages,
} from "@microsoft/teamsfx-core/build/common/deps-checker";
import * as os from "os";
import { vscodeHelper } from "./vscodeHelper";

export class VSCodeDepsChecker {
  private static learnMoreButtonText = "Learn more";

  private readonly depsManager: DepsManager;

  constructor(private logger: DepsLogger, private telemetry: DepsTelemetry) {
    this.depsManager = new DepsManager(logger, telemetry);
  }

  private static isLinux(): boolean {
    return os.type() === "Linux";
  }

  public async resolve(deps: DepsType[]): Promise<boolean> {
    const enabledDeps = await VSCodeDepsChecker.getEnabledDepsWithFolder(deps);
    const depsStatus = await this.ensure(enabledDeps);

    const shouldContinue = await this.handleLinux(depsStatus);
    if (!shouldContinue) {
      return false;
    }

    for (const dep of depsStatus) {
      // only one error because of fast fail
      if (!dep.isInstalled && dep.error) {
        await this.logger.error(`${dep.error.message}, error = ${dep.error}`);
        this.logger.cleanup();
        await this.display(dep.error.message, dep.error.helpLink);
        return false;
      }
    }
    return true;
  }

  // Used in fx-extension.validate-local-prerequisites
  public static async getEnabledDeps(deps: DepsType[]): Promise<DepsType[]> {
    const res: DepsType[] = [];
    for (const dep of deps) {
      if (VSCodeDepsChecker.isEnabled(dep)) {
        res.push(dep);
      }
    }
    return res;
  }

  // Used in fx-extension.validate-dependencies
  private static async getEnabledDepsWithFolder(deps: DepsType[]): Promise<DepsType[]> {
    const res: DepsType[] = [];
    for (const dep of deps) {
      if (VSCodeDepsChecker.isEnabled(dep) && (await VSCodeDepsChecker.containsFolder(dep))) {
        res.push(dep);
      }
    }
    return res;
  }

  public static getNodeDeps(): DepsType[] {
    return [DepsType.SpfxNode, DepsType.AzureNode];
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

  private async handleLinux(depsStatus: DependencyStatus[]): Promise<boolean> {
    if (!VSCodeDepsChecker.isLinux()) {
      return true;
    }
    const manuallyInstallDeps = depsStatus
      .filter((dep) => !dep.isInstalled)
      .filter((dep) => !dep.details.isLinuxSupported);

    if (manuallyInstallDeps.length == 0) {
      return true;
    }

    const displayMessage = await this.generateLinuxMsg(manuallyInstallDeps);
    await this.display(displayMessage, defaultHelpLink);
    this.logger.cleanup();
    return false;
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
    return Messages.linuxDepsNotFound().split("@SupportedPackages").join(supportedMessage);
  }

  public async display(message: string, link: string): Promise<void> {
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

  private static isEnabled(dep: DepsType): boolean {
    switch (dep) {
      case DepsType.AzureNode:
      case DepsType.SpfxNode:
        return vscodeHelper.isNodeCheckerEnabled();
      case DepsType.Dotnet:
        return vscodeHelper.isDotnetCheckerEnabled();
      case DepsType.FuncCoreTools:
        return vscodeHelper.isFuncCoreToolsEnabled();
      case DepsType.Ngrok:
        return vscodeHelper.isNgrokCheckerEnabled();
      default:
        return false;
    }
  }

  private static async containsFolder(dep: DepsType): Promise<boolean> {
    switch (dep) {
      case DepsType.FuncCoreTools:
        return await vscodeHelper.hasFunction();
      case DepsType.Ngrok:
        return await vscodeHelper.hasBot();
      default:
        return true;
    }
  }
}
