// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { DepsChecker, DepsType } from "./depsChecker";
import { DepsLogger } from "./depsLogger";
import { DepsTelemetry } from "./depsTelemetry";
import { DotnetChecker } from "./internal/dotnetChecker";
import { FuncToolChecker } from "./internal/funcToolChecker";
import { LtsNodeChecker, ProjectNodeChecker } from "./internal/nodeChecker";
import { VxTestAppChecker } from "./internal/vxTestAppChecker";

export class CheckerFactory {
  public static createChecker(
    type: DepsType,
    logger: DepsLogger,
    telemetry: DepsTelemetry
  ): DepsChecker {
    switch (type) {
      case DepsType.ProjectNode:
        return new ProjectNodeChecker(logger, telemetry);
      case DepsType.LtsNode:
        return new LtsNodeChecker(logger, telemetry);
      case DepsType.Dotnet:
        return new DotnetChecker(logger, telemetry);
      case DepsType.FuncCoreTools:
        return new FuncToolChecker(logger, telemetry);
      case DepsType.VxTestApp:
        return new VxTestAppChecker(logger, telemetry);
      default:
        throw Error("dependency type is undefined");
    }
  }
}
