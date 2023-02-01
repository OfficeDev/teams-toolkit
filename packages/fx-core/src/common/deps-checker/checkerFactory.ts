// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { DotnetChecker } from "./internal/dotnetChecker";
import { DepsLogger } from "./depsLogger";
import { DepsTelemetry } from "./depsTelemetry";
import { DepsChecker } from "./depsChecker";
import {
  AzureNodeChecker,
  SPFxNodeChecker,
  ProjectNodeChecker,
  LtsNodeChecker,
} from "./internal/nodeChecker";
import { FuncToolChecker } from "./internal/funcToolChecker";
import { NgrokChecker } from "./internal/ngrokChecker";
import { DepsType } from "./depsChecker";
import { VxTestAppChecker } from "./internal/vxTestAppChecker";

export class CheckerFactory {
  public static createChecker(
    type: DepsType,
    logger: DepsLogger,
    telemetry: DepsTelemetry
  ): DepsChecker {
    switch (type) {
      case DepsType.AzureNode:
        return new AzureNodeChecker(logger, telemetry);
      case DepsType.SpfxNode:
        return new SPFxNodeChecker(logger, telemetry);
      case DepsType.ProjectNode:
        return new ProjectNodeChecker(logger, telemetry);
      case DepsType.LtsNode:
        return new LtsNodeChecker(logger, telemetry);
      case DepsType.Dotnet:
        return new DotnetChecker(logger, telemetry);
      case DepsType.Ngrok:
        return new NgrokChecker(logger, telemetry);
      case DepsType.FuncCoreTools:
        return new FuncToolChecker(logger, telemetry);
      case DepsType.VxTestApp:
        return new VxTestAppChecker(logger, telemetry);
      default:
        throw Error("dependency type is undefined");
    }
  }
}
