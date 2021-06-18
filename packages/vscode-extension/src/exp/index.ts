// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { IExperimentationService, IExperimentationTelemetry, TargetPopulation, getExperimentationServiceAsync } from "vscode-tas-client";
import * as pkg from "./../../package.json";
import { ExtTelemetry } from "./../telemetry/extTelemetry"

export namespace exp {
    const sharedProperties: {[key: string]: string} = {};
    let expService: IExperimentationService;

    export function getSharedProperties(): {[key: string]: string} {
        return sharedProperties;
    }

    export function getExpService(): IExperimentationService {
        return expService;
    }

    export async function initialize(context: vscode.ExtensionContext) {
        expService = await getExperimentationServiceAsync(
            pkg.name,
            pkg.version,
            TargetPopulation.Public,
            new ExperimentationTelemetry(),
            context.globalState
        );
    }

    class ExperimentationTelemetry implements IExperimentationTelemetry {
        public setSharedProperty(name: string, value: string): void {
            sharedProperties[name] = value;
        }
    
        public postEvent(eventName: string, props: Map<string, string>): void {
            let properties = { ...sharedProperties };
            props.forEach((value, key) => {
                properties[key] = value;
            });
            ExtTelemetry.sendTelemetryEvent(eventName, properties);
        }
    }
}