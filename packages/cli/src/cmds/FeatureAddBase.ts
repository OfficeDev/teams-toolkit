// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import path from "path";
import { Argv } from "yargs";

import { err, FxError, ok, Platform, ProjectSettings, Result } from "@microsoft/teamsfx-api";
import { AzureSolutionQuestionNames as Names } from "@microsoft/teamsfx-core/build/component/constants";
import { FeatureId } from "@microsoft/teamsfx-core/build/component/question";

import activate from "../activate";
import { flattenNodes, getSystemInputs, setSubscriptionId } from "../utils";
import { YargsCommand } from "../yargsCommand";
import CliTelemetry from "../telemetry/cliTelemetry";
import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetrySuccess,
} from "../telemetry/cliTelemetryEvents";
import { automaticNpmInstallHandler } from "./preview/npmInstallHandler";
import { AddFeatureFunc, CLIHelpInputs, EmptyQTreeNode, RootFolderNode } from "../constants";
import { toYargsOptionsGroup } from "../questionUtils";

export abstract class FeatureAddBase extends YargsCommand {
  abstract readonly telemetryStartEvent: TelemetryEvent;
  abstract readonly telemetryEvent: TelemetryEvent;
  abstract readonly featureId: FeatureId;

  abstract getNpmInstallExcludeCaps(projectSettings: ProjectSettings | undefined): {
    excludeFrontend: boolean;
    excludeBackend: boolean;
    excludeBot: boolean;
  };

  public override async builder(yargs: Argv): Promise<Argv<any>> {
    const result = await activate();
    if (result.isErr()) {
      throw result.error;
    }
    const core = result.value;
    {
      const result = await core.getQuestionsForAddFeature(this.featureId, CLIHelpInputs);
      if (result.isErr()) {
        throw result.error;
      }
      const node = result.value ?? EmptyQTreeNode;
      const filteredNode = node;
      const nodes = flattenNodes(filteredNode).concat([RootFolderNode]);
      this.params = toYargsOptionsGroup(nodes);
    }
    return yargs.options(this.params);
  }

  public override async runCommand(args: {
    [argName: string]: string;
  }): Promise<Result<null, FxError>> {
    const rootFolder = path.resolve(args.folder || "./");
    CliTelemetry.withRootFolder(rootFolder).sendTelemetryEvent(this.telemetryStartEvent);

    if ("subscription" in args) {
      const result = await setSubscriptionId(args.subscription, rootFolder);
      if (result.isErr()) {
        CliTelemetry.sendTelemetryErrorEvent(this.telemetryEvent, result.error, {
          [TelemetryProperty.Resources]: this.commandHead,
        });
        return result;
      }
    }

    const result = await activate(rootFolder);
    if (result.isErr()) {
      CliTelemetry.sendTelemetryErrorEvent(this.telemetryEvent, result.error, {
        [TelemetryProperty.Capabilities]: this.commandHead,
      });
      return err(result.error);
    }

    const core = result.value;
    const configResult = await core.getProjectConfigV3({
      projectPath: rootFolder,
      platform: Platform.CLI,
    });
    if (configResult.isErr()) {
      CliTelemetry.sendTelemetryErrorEvent(this.telemetryEvent, configResult.error, {
        [TelemetryProperty.Capabilities]: this.commandHead,
      });
      return err(configResult.error);
    }
    const { excludeFrontend, excludeBackend, excludeBot } = this.getNpmInstallExcludeCaps(
      configResult.value?.projectSettings
    );

    {
      const inputs = getSystemInputs(rootFolder);
      inputs[Names.Features] = this.featureId;
      inputs.ignoreEnvInfo = true;
      const result = await core.executeUserTask(AddFeatureFunc, inputs);
      if (result.isErr()) {
        CliTelemetry.sendTelemetryErrorEvent(this.telemetryEvent, result.error, {
          [TelemetryProperty.Capabilities]: this.commandHead,
        });
        return err(result.error);
      }
    }

    await automaticNpmInstallHandler(rootFolder, excludeFrontend, excludeBackend, excludeBot);

    CliTelemetry.sendTelemetryEvent(this.telemetryEvent, {
      [TelemetryProperty.Success]: TelemetrySuccess.Yes,
      [TelemetryProperty.Capabilities]: this.commandHead,
    });
    return ok(null);
  }
}
