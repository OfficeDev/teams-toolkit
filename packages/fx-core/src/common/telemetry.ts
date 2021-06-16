// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, Inputs, Platform, TelemetryReporter, UserError } from "@microsoft/teamsfx-api";
import { Logger } from "../core";


export enum TelemetryProperty {
	TriggerFrom = "trigger-from",
	Component = "component",
	AppId = "appid",
	Success = "success",
	ErrorType = "error-type",
	ErrorCode = "error-code",
	ErrorMessage = "error-message",
	SampleAppName = "sample-app-name",
}

export enum TelemetryEvent {
	SelectSubscription = "select-subscription",
	DownloadSampleStart = "download-sample-start",
	DownloadSample = "download-sample",
}

export enum TelemetrySuccess {
	Yes = "yes",
	No = "no",
}

export enum TelemetryErrorType {
	UserError = "user",
	SystemError = "system",
}
 
export enum Component{
	vsc = "extension",
	cli = "cli",
	vs = "vs"
} 

export function sendTelemetryEvent(
	telemetryReporter: TelemetryReporter,
	inputs: Inputs,
	eventName: string,
	properties?: { [p: string]: string },
	measurements?: { [p: string]: number }
): void {
	if (!properties) {
		properties = {};
	}

	if (TelemetryProperty.Component in properties === false) {
		if (inputs.platform === Platform.VSCode) {
			properties[TelemetryProperty.Component] = Component.vsc;
		} else if(inputs.platform === Platform.VS) {
			properties[TelemetryProperty.Component] = Component.vs;
		}
		else {
			properties[TelemetryProperty.Component] = Component.cli;
		}
	}
	telemetryReporter.sendTelemetryEvent(eventName, properties, measurements);
	Logger.info(`sendTelemetryEvent, event:${eventName}, properties:${properties}`);
}

export function sendTelemetryErrorEvent(
	telemetryReporter: TelemetryReporter,
	inputs: Inputs,
	eventName: string,
	error: FxError,
	properties ?: { [p: string]: string },
	measurements ?: { [p: string]: number },
	errorProps ?: string[]
): void {
	if(!properties) {
		properties = {};
	}
  
	if (TelemetryProperty.Component in properties === false) {
		if (inputs.platform === Platform.VSCode) {
			properties[TelemetryProperty.Component] = Component.vsc;
		} else if(inputs.platform === Platform.VS) {
			properties[TelemetryProperty.Component] = Component.vs;
		}
		else {
			properties[TelemetryProperty.Component] = Component.cli;
		}
	}
	
	properties[TelemetryProperty.Success] = TelemetrySuccess.No;
	if (error instanceof UserError) {
		properties[TelemetryProperty.ErrorType] = TelemetryErrorType.UserError;
	} else {
		properties[TelemetryProperty.ErrorType] = TelemetryErrorType.SystemError;
	}

	properties[TelemetryProperty.ErrorCode] = `${error.source}.${error.name}`;
	properties[TelemetryProperty.ErrorMessage] = error.message;

	telemetryReporter.sendTelemetryErrorEvent(eventName, properties, measurements, errorProps);
	
	Logger.info(`sendTelemetryErrorEvent, event:${eventName}, properties:${properties}, errorProps:${errorProps}`);
}