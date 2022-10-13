// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { ProjectSettings } from "@microsoft/teamsfx-api";
import { ProjectSettingsHelper } from "@microsoft/teamsfx-core/build/common/local/projectSettingsHelper";
import { FeatureId } from "@microsoft/teamsfx-core/build/component/question";

import { TelemetryEvent } from "../telemetry/cliTelemetryEvents";
import { FeatureAddBase } from "./FeatureAddBase";

abstract class ResourceAddBase extends FeatureAddBase {
  public readonly telemetryStartEvent = TelemetryEvent.UpdateProjectStart;
  public readonly telemetryEvent = TelemetryEvent.UpdateProject;

  public override getNpmInstallExcludeCaps(settings: ProjectSettings | undefined) {
    return {
      excludeFrontend: true,
      excludeBackend: true,
      excludeBot: true,
    };
  }
}

export class ResourceAddFunction extends ResourceAddBase {
  public readonly featureId = FeatureId.function;
  public readonly commandHead = `azure-function`;
  public readonly command = `${this.commandHead}`;
  public readonly description =
    "A serverless, event-driven compute solution that allows you to write less code";

  public override getNpmInstallExcludeCaps(settings: ProjectSettings | undefined) {
    return {
      excludeFrontend: true,
      excludeBackend: ProjectSettingsHelper.includeBackend(settings),
      excludeBot: true,
    };
  }
}

export class ResourceAddSql extends ResourceAddBase {
  public readonly featureId: FeatureId = FeatureId.sql; /// For V3
  public readonly commandHead = `azure-sql`;
  public readonly command = `${this.commandHead}`;
  public readonly description =
    "An always-up-to-date relational database service built for the cloud";
}

export class ResourceAddApim extends ResourceAddBase {
  public readonly featureId = FeatureId.apim;
  public readonly commandHead = `azure-apim`;
  public readonly command = `${this.commandHead}`;
  public readonly description =
    "A hybrid, multicloud management platform for APIs across all environments";

  public override modifyArguments(args: { [argName: string]: any }) {
    if (!("apim-resource-group" in args)) {
      args["apim-resource-group"] = undefined;
    }
    if (!("apim-service-name" in args)) {
      args["apim-service-name"] = undefined;
    }
    return args;
  }
}

export class ResourceAddKeyVault extends ResourceAddBase {
  public readonly featureId = FeatureId.keyvault;
  public readonly commandHead = `azure-keyvault`;
  public readonly command = `${this.commandHead}`;
  public readonly description = "A cloud service for securely storing and accessing secrets";
}
