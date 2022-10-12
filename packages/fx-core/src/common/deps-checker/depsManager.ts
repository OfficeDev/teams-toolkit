// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { DepsLogger, EmptyLogger } from "./depsLogger";
import { DepsTelemetry } from "./depsTelemetry";
import { DependencyStatus, DepsChecker, DepsType } from "./depsChecker";
import { CheckerFactory } from "./checkerFactory";

export type DepsOptions = {
  fastFail?: boolean;
  doctor?: boolean;
};

export class DepsManager {
  private static readonly depsOrders = [
    DepsType.AzureNode,
    DepsType.SpfxNode,
    DepsType.SpfxNodeV1_16,
    DepsType.Dotnet,
    DepsType.FuncCoreTools,
    DepsType.Ngrok,
  ];

  private readonly logger: DepsLogger;
  private readonly emptyLogger: DepsLogger;
  private readonly telemetry: DepsTelemetry;

  constructor(logger: DepsLogger, telemetry: DepsTelemetry) {
    if (!logger) {
      throw Error("Logger is undefined.");
    }
    if (!telemetry) {
      throw Error("Logger is undefined.");
    }

    this.logger = logger;
    this.telemetry = telemetry;
    this.emptyLogger = new EmptyLogger();
  }

  /**
   * Ensure dependencies installed.
   * Installation Orders:
   *      Node, Dotnet, FuncCoreTools, Ngrok
   * @param dependencies Dependency types. If it is empty, do nothing.
   * @param options If fastFail is false, it will continue even if one of the dependencies fails to install. Default value is true.
   */
  public async ensureDependencies(
    dependencies: DepsType[],
    { fastFail = true, doctor = false }: DepsOptions
  ): Promise<DependencyStatus[]> {
    if (!dependencies || dependencies.length == 0) {
      return [];
    }

    const orderedDeps: DepsType[] = DepsManager.sortBySequence(dependencies);
    const result: DependencyStatus[] = [];
    let shouldInstall = true;
    for (const type of orderedDeps) {
      const status: DependencyStatus = await this.resolve(type, shouldInstall, doctor);
      result.push(status);

      if (fastFail && !status.isInstalled) {
        shouldInstall = false;
      }
    }
    return result;
  }

  public async getStatus(depsTypes: DepsType[]): Promise<DependencyStatus[]> {
    if (!depsTypes || depsTypes.length == 0) {
      return [];
    }
    const result: DependencyStatus[] = [];
    for (const type of depsTypes) {
      result.push(await this.resolve(type, false));
    }
    return result;
  }

  private async resolve(
    type: DepsType,
    shouldInstall: boolean,
    doctor = false
  ): Promise<DependencyStatus> {
    const checker: DepsChecker = CheckerFactory.createChecker(
      type,
      doctor ? this.emptyLogger : this.logger,
      this.telemetry
    );

    if (shouldInstall) {
      return await checker.resolve();
    } else {
      return await checker.getInstallationInfo();
    }
  }

  public static sortBySequence(dependencies: DepsType[]): DepsType[] {
    return dependencies
      .filter((value) => value != null)
      .sort((a, b) => DepsManager.depsOrders.indexOf(a) - DepsManager.depsOrders.indexOf(b));
  }
}
