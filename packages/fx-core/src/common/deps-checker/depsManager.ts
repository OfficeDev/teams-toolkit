// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { DepsLogger, EmptyLogger } from "./depsLogger";
import { DepsTelemetry } from "./depsTelemetry";
import { Dependency, DependencyStatus, DepsChecker, DepsType, InstallOptions } from "./depsChecker";
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
    DepsType.VxTestApp,
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
      // ensureDependencies is only for < v3 so it does'nt need installOptions
      const status: DependencyStatus = await this.resolve(
        { depsType: type, installOptions: undefined },
        shouldInstall,
        doctor
      );
      result.push(status);

      if (fastFail && !status.isInstalled) {
        shouldInstall = false;
      }
    }
    return result;
  }

  public async ensureDependency(
    depsType: DepsType,
    doctor = false,
    options?: InstallOptions
  ): Promise<DependencyStatus> {
    return await this.resolve({ depsType, installOptions: options }, true, doctor);
  }

  /**
   * @deprecated
   * Get status without installOptions. Only used in legacy code.
   */
  public async getStatus(depsTypes: DepsType[]): Promise<DependencyStatus[]> {
    return this.getStatusWithInstallOptions(
      depsTypes.map((dep) => {
        return { depsType: dep, installOptions: undefined };
      })
    );
  }

  public async getStatusWithInstallOptions(deps: Dependency[]): Promise<DependencyStatus[]> {
    if (!deps || deps.length == 0) {
      return [];
    }
    const result: DependencyStatus[] = [];
    for (const dep of deps) {
      result.push(await this.resolve(dep, false));
    }
    return result;
  }

  private async resolve(
    dependency: Dependency,
    shouldInstall: boolean,
    doctor = false
  ): Promise<DependencyStatus> {
    const checker: DepsChecker = CheckerFactory.createChecker(
      dependency.depsType,
      doctor ? this.emptyLogger : this.logger,
      this.telemetry
    );

    if (shouldInstall) {
      return await checker.resolve(dependency.installOptions);
    } else {
      return await checker.getInstallationInfo(dependency.installOptions);
    }
  }

  public static sortBySequence(dependencies: DepsType[]): DepsType[] {
    return dependencies
      .filter((value) => value != null)
      .sort((a, b) => DepsManager.depsOrders.indexOf(a) - DepsManager.depsOrders.indexOf(b));
  }

  public static sortDependenciesBySequence(dependencies: Dependency[]): Dependency[] {
    return dependencies
      .filter((value) => value != null)
      .sort(
        (a, b) =>
          DepsManager.depsOrders.indexOf(a.depsType) - DepsManager.depsOrders.indexOf(b.depsType)
      );
  }
}
