// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  DependencyStatus,
  DepsLogger,
  DepsManager,
  DepsOptions,
  DepsTelemetry,
  DepsType,
  Messages,
  DepsCheckerEvent,
  defaultHelpLink,
} from "@microsoft/teamsfx-core";
import {
  openUrl,
  showWarningMessage,
  isNodeCheckerEnabled,
  isDotnetCheckerEnabled,
  isFuncCoreToolsEnabled,
  isLinux,
  isNgrokCheckerEnabled,
} from "./cliUtils";

export class CliDepsChecker {
  private static learnMoreButtonText = "Learn more";

  private readonly depsManager: DepsManager;

  constructor(
    private logger: DepsLogger,
    private telemetry: DepsTelemetry,
    private hasBackend: boolean,
    private hasBot: boolean
  ) {
    this.depsManager = new DepsManager(logger, telemetry);
  }

  public async resolve(deps: DepsType[]): Promise<boolean> {
    const enabledDeps = await this.getEnabledDeps(deps);
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
    return (await this.ensure([dep]))[0];
  }

  private async ensure(deps: DepsType[]): Promise<DependencyStatus[]> {
    if (deps.length == 0) {
      return [];
    }
    const options: DepsOptions = { fastFail: true };
    return await this.depsManager.ensureDependencies(deps, options);
  }

  private async handleLinux(depsStatus: DependencyStatus[]): Promise<boolean> {
    if (!isLinux()) {
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
    return Messages.linuxDepsNotFound.split("@SupportedPackages").join(supportedMessage);
  }

  private async display(message: string, link: string): Promise<void> {
    const clickButton = await showWarningMessage(message, CliDepsChecker.learnMoreButtonText);
    if (clickButton) {
      this.telemetry.sendEvent(DepsCheckerEvent.clickLearnMore);
      await openUrl(link);
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
        return await isNodeCheckerEnabled();
      case DepsType.FunctionNode:
        return (await isNodeCheckerEnabled()) && this.hasBackend;
      case DepsType.Dotnet:
        return await isDotnetCheckerEnabled();
      case DepsType.FuncCoreTools:
        return (await isFuncCoreToolsEnabled()) && this.hasBackend;
      case DepsType.Ngrok:
        return this.hasBot && (await isNgrokCheckerEnabled());
      default:
        return false;
    }
  }
}
