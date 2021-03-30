// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

/**
 * Reporter of telemetry to send event and exception to app insights.
 * Event and exception follow the [Application Insights telemetry data model](https://docs.microsoft.com/en-us/azure/azure-monitor/app/data-model)
 */
export interface TelemetryReporter {
    /**
     * Send general events to App Insights
     * @param eventName Event name. Max length: 512 characters. To allow proper grouping and useful metrics, restrict your application so that it generates a small number of separate event names.
     * @param properties Name-value collection of custom properties. Max key length: 150,  Max value length: 8192. this collection is used to extend standard telemetry with the custom dimensions.
     * @param measurements Collection of custom measurements. Use this collection to report named measurement associated with the telemetry item.
     *
     */
    sendTelemetryEvent(
        eventName: string,
        properties?: { [key: string]: string },
        measurements?: { [key: string]: number },
    ): void;

    /**
     * Send error telemetry as traditional events to App Insights.
     * @param eventName Event name. Max length: 512 characters.
     * @param properties Name-value collection of custom properties. Max key length: 150,  Max value length: 8192.
     * @param measurements Collection of custom measurements.
     * @param errorProps Str collection of valuable error messages.
     */
    sendTelemetryErrorEvent(
        eventName: string,
        properties?: { [key: string]: string },
        measurements?: { [key: string]: number },
        errorProps?: string[],
    ): void;

    /**
     * Send error for diagnostics in App Insights.
     * @param error Error to troubleshooting.
     * @param properties Name-value collection of custom properties. Max key length: 150,  Max value length: 8192.
     * @param measurements Collection of custom measurements.
     */
    sendTelemetryException(
        error: Error,
        properties?: { [key: string]: string },
        measurements?: { [key: string]: number },
    ): void;
}

/**
 *  Proxy of telemetry reporter to enhance reporter for plugins with some plugin-common ability in the way plugins are not aware of it.
 */
 export class PluginTelemetryReporter implements TelemetryReporter {
    private readonly reporter: TelemetryReporter;
    private readonly pluginName: string;

    constructor(reporter: TelemetryReporter, pluginName: string) {
        this.reporter = reporter;
        this.pluginName = pluginName;
    }

    sendTelemetryEvent(eventName: string, properties = {} as Record<string, string>, measurements?: { [p: string]: number }): void {
        this.addPluginProps(properties);
        this.reporter.sendTelemetryEvent(this.pluginify(eventName), properties, measurements);
    }

    sendTelemetryErrorEvent(eventName: string, properties = {} as Record<string, string>, measurements?: { [p: string]: number }, errorProps?: string[]): void {
        this.addPluginProps(properties);
        this.reporter.sendTelemetryErrorEvent(this.pluginify(eventName), properties, measurements, errorProps);
    }

    sendTelemetryException(error: Error, properties = {} as Record<string, string>, measurements?: { [p: string]: number }): void {
        this.addPluginProps(properties);
        this.reporter.sendTelemetryException(error, properties, measurements);
    }

    private addPluginProps(properties: { [key: string]: string }) {
        properties.pluginName = this.pluginName;
    }

    private pluginify(eventName: string): string {
        return this.pluginName + "-" + eventName;
    }
}
