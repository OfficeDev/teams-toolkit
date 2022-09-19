// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { ProjectSettings } from "@microsoft/teamsfx-api";
import { ProjectSettingsHelper } from "@microsoft/teamsfx-core/build/common/local/projectSettingsHelper";
import { FeatureId } from "@microsoft/teamsfx-core/build/component/questionV3";

import { TelemetryEvent } from "../telemetry/cliTelemetryEvents";
import { FeatureAddBase } from "./FeatureAddBase";

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
