// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { err, FxError, ok, ProjectSettings, Result, Stage } from "@microsoft/teamsfx-api";
import { ProjectSettingsHelper } from "@microsoft/teamsfx-core/build/common/local/projectSettingsHelper";
import {
  FeatureId,
  getQuestionsForAddWebpart,
} from "@microsoft/teamsfx-core/build/component/question";
import { SPFxQuestionNames } from "@microsoft/teamsfx-core/build/component/constants";
import { Argv } from "yargs";
import activate from "../activate";
import { CLIHelpInputs, EmptyQTreeNode, RootFolderNode } from "../constants";
import cliTelemetry from "../telemetry/cliTelemetry";

import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetrySuccess,
} from "../telemetry/cliTelemetryEvents";
import { FeatureAddBase } from "./FeatureAddBase";
import * as path from "path";
import { flattenNodes, getSystemInputs } from "../utils";
import { YargsCommand } from "../yargsCommand";
import { toYargsOptionsGroup } from "../questionUtils";

abstract class CapabilityAddBase extends FeatureAddBase {
  public readonly telemetryStartEvent = TelemetryEvent.AddCapStart;
  public readonly telemetryEvent = TelemetryEvent.AddCap;
}

export class CapabilityAddTab extends CapabilityAddBase {
  public readonly commandHead = `tab`;
  public readonly command = `${this.commandHead}`;
  public readonly description = "Hello world webpages embedded in Microsoft Teams";
  public readonly featureId = FeatureId.TabNonSso;

  public override getNpmInstallExcludeCaps(settings: ProjectSettings | undefined) {
    return {
      excludeFrontend: ProjectSettingsHelper.includeFrontend(settings),
      excludeBackend: true,
      excludeBot: true,
    };
  }
}

export class CapabilityAddSSOTab extends CapabilityAddBase {
  public readonly commandHead = `sso-tab`;
  public readonly command = `${this.commandHead}`;
  public readonly description = "Teams identity aware webpages embedded in Microsoft Teams";
  public readonly featureId = FeatureId.Tab;

  public override getNpmInstallExcludeCaps(settings: ProjectSettings | undefined) {
    return {
      excludeFrontend: ProjectSettingsHelper.includeFrontend(settings),
      excludeBackend: true,
      excludeBot: true,
    };
  }
}

export class CapabilityAddSPFxTab extends CapabilityAddBase {
  public readonly commandHead = `spfx-tab`;
  public readonly command = `${this.commandHead}`;
  public readonly description =
    "Teams-aware webpages with SharePoint Framework embedded in Microsoft Teams";
  public readonly featureId = FeatureId.TabSPFx;

  public override getNpmInstallExcludeCaps(settings: ProjectSettings | undefined) {
    return {
      excludeFrontend: ProjectSettingsHelper.includeFrontend(settings),
      excludeBackend: true,
      excludeBot: true,
    };
  }
}

export class AddWebpart extends YargsCommand {
  public readonly commandHead = `SPFxWebPart`;
  public readonly command = `${this.commandHead}`;
  public readonly description = "Auto-hosted SPFx web part tightly integrated with Microsoft Teams";

  public override async builder(yargs: Argv): Promise<Argv<any>> {
    {
      const result = await getQuestionsForAddWebpart(CLIHelpInputs);
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
    const rootFolder = path.resolve((args.folder as string) || "./");
    cliTelemetry.withRootFolder(rootFolder).sendTelemetryEvent(TelemetryEvent.AddWebpartStart);

    const resultFolder = await activate(rootFolder);
    if (resultFolder.isErr()) {
      cliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.AddWebpart, resultFolder.error);
      return err(resultFolder.error);
    }
    const core = resultFolder.value;
    const inputs = getSystemInputs(rootFolder, args.env);
    inputs.stage = Stage.addWebpart;
    if (args["spfx-install-latest-package"]) {
      inputs["spfx-install-latest-package"] = args["spfx-install-latest-package"];
    }
    if (args[SPFxQuestionNames.SPFxFolder]) {
      inputs[SPFxQuestionNames.SPFxFolder] = args[SPFxQuestionNames.SPFxFolder];
    }
    if (args[SPFxQuestionNames.WebPartName]) {
      inputs[SPFxQuestionNames.WebPartName] = args[SPFxQuestionNames.WebPartName];
    }
    if (args[SPFxQuestionNames.ManifestPath]) {
      inputs[SPFxQuestionNames.ManifestPath] = args[SPFxQuestionNames.ManifestPath];
    }
    if (args[SPFxQuestionNames.LocalManifestPath]) {
      inputs[SPFxQuestionNames.LocalManifestPath] = args[SPFxQuestionNames.LocalManifestPath];
    }
    const result = await core.addWebpart(inputs);
    if (result.isErr()) {
      cliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.AddWebpart, result.error);
      return err(result.error);
    }

    cliTelemetry.sendTelemetryEvent(TelemetryEvent.AddWebpart, {
      [TelemetryProperty.Success]: TelemetrySuccess.Yes,
    });

    return ok(null);
  }
}

abstract class CapabilityAddBotBase extends CapabilityAddBase {
  public override getNpmInstallExcludeCaps(settings: ProjectSettings | undefined) {
    return {
      excludeFrontend: true,
      excludeBackend: true,
      excludeBot: ProjectSettingsHelper.includeBot(settings),
    };
  }
}

export class CapabilityAddBot extends CapabilityAddBotBase {
  public readonly commandHead = `bot`;
  public readonly command = `${this.commandHead}`;
  public readonly description = "Hello world chatbot to run simple and repetitive tasks by user";
  public readonly featureId = FeatureId.Bot;
}

export class CapabilityAddMessageExtension extends CapabilityAddBotBase {
  public readonly commandHead = `message-extension`;
  public readonly command = `${this.commandHead}`;
  public readonly description =
    "Hello world message extension allowing interactions via buttons and forms";
  public readonly featureId = FeatureId.MessagingExtension;
}

export class CapabilityAddNotification extends CapabilityAddBotBase {
  public readonly commandHead = "notification";
  public readonly command = `${this.commandHead}`;
  public readonly description = "Send notification to Microsoft Teams via various triggers";
  public readonly featureId = FeatureId.Notification;
}

export class CapabilityAddCommandAndResponse extends CapabilityAddBotBase {
  public readonly commandHead = "command-and-response";
  public readonly command = `${this.commandHead}`;
  public readonly description = "Respond to simple commands in Microsoft Teams chat";
  public readonly featureId = FeatureId.CommandAndResponse;
}

export class CapabilityAddWorkflow extends CapabilityAddBotBase {
  public readonly commandHead = "workflow";
  public readonly command = `${this.commandHead}`;
  public readonly description =
    "Automate repetitive workflows for common business processes in Microsoft Teams chat";
  public readonly featureId = FeatureId.Workflow;
}
