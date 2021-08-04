/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable @typescript-eslint/no-unused-vars */
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as vscode from "vscode";
import { VSCodeTelemetryReporter } from "../commonlib/telemetry";
import {
  TelemetryProperty,
  TelemetryComponentType,
  TelemetrySuccess,
  TelemetryEvent,
  TelemetryErrorType,
} from "./extTelemetryEvents";
import * as extensionPackage from "../../package.json";
import { FxError, Stage, UserError } from "@microsoft/teamsfx-api";
import { getTeamsAppId } from "../utils/commonUtils";

export namespace ExtTelemetry {
  export let reporter: VSCodeTelemetryReporter;
  export let hasSentTelemetry = false;

  export function setHasSentTelemetry(eventName: string) {
    if (eventName === "query-expfeature") return;
    hasSentTelemetry = true;
  }

  export function addSharedProperty(name: string, value: string): void {
    reporter.addSharedProperty(name, value);
  }

  export class Reporter extends vscode.Disposable {
    constructor(ctx: vscode.ExtensionContext) {
      super(() => reporter.dispose());
      reporter = new VSCodeTelemetryReporter(
        extensionPackage.aiKey,
        extensionPackage.version,
        extensionPackage.name
      );
    }
  }

  export function stageToEvent(stage: Stage): string | undefined {
    /* debug telemetry event is not handling here */
    switch (stage) {
      case Stage.create:
        return TelemetryEvent.CreateProject;
      case Stage.update:
        return TelemetryEvent.AddResource;
      case Stage.provision:
        return TelemetryEvent.Provision;
      case Stage.deploy:
        return TelemetryEvent.Deploy;
      case Stage.publish:
        return TelemetryEvent.Publish;
      default:
        return undefined;
    }
  }

  export function sendTelemetryEvent(
    eventName: string,
    properties?: { [p: string]: string },
    measurements?: { [p: string]: number }
  ): void {
    setHasSentTelemetry(eventName);
    if (!properties) {
      properties = {};
    }

    if (TelemetryProperty.Component in properties === false) {
      properties[TelemetryProperty.Component] = TelemetryComponentType;
    }

    properties[TelemetryProperty.AapId] = getTeamsAppId();

    reporter.sendTelemetryEvent(eventName, properties, measurements);
  }

  export function sendTelemetryErrorEvent(
    eventName: string,
    error: FxError,
    properties?: { [p: string]: string },
    measurements?: { [p: string]: number },
    errorProps?: string[]
  ): void {
    if (!properties) {
      properties = {};
    }

    if (TelemetryProperty.Component in properties === false) {
      properties[TelemetryProperty.Component] = TelemetryComponentType;
    }

    properties[TelemetryProperty.AapId] = getTeamsAppId();

    properties[TelemetryProperty.Success] = TelemetrySuccess.No;
    if (error instanceof UserError) {
      properties[TelemetryProperty.ErrorType] = TelemetryErrorType.UserError;
    } else {
      properties[TelemetryProperty.ErrorType] = TelemetryErrorType.SystemError;
    }

    properties[TelemetryProperty.ErrorCode] = `${error.source}.${error.name}`;
    properties[TelemetryProperty.ErrorMessage] = error.message;

    reporter.sendTelemetryErrorEvent(eventName, properties, measurements, errorProps);
  }

  export function sendTelemetryException(
    error: Error,
    properties?: { [p: string]: string },
    measurements?: { [p: string]: number }
  ): void {
    if (!properties) {
      properties = {};
    }

    if (TelemetryProperty.Component in properties === false) {
      properties[TelemetryProperty.Component] = TelemetryComponentType;
    }

    properties[TelemetryProperty.AapId] = getTeamsAppId();

    reporter.sendTelemetryException(error, properties, measurements);
  }
}
