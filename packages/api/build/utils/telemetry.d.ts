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
    sendTelemetryEvent(eventName: string, properties?: {
        [key: string]: string;
    }, measurements?: {
        [key: string]: number;
    }): void;
    /**
     * Send error telemetry as traditional events to App Insights.
     * @param eventName Event name. Max length: 512 characters.
     * @param properties Name-value collection of custom properties. Max key length: 150,  Max value length: 8192.
     * @param measurements Collection of custom measurements.
     * @param errorProps Str collection of valuable error messages.
     */
    sendTelemetryErrorEvent(eventName: string, properties?: {
        [key: string]: string;
    }, measurements?: {
        [key: string]: number;
    }, errorProps?: string[]): void;
    /**
     * Send error for diagnostics in App Insights.
     * @param error Error to troubleshooting.
     * @param properties Name-value collection of custom properties. Max key length: 150,  Max value length: 8192.
     * @param measurements Collection of custom measurements.
     */
    sendTelemetryException(error: Error, properties?: {
        [key: string]: string;
    }, measurements?: {
        [key: string]: number;
    }): void;
}
//# sourceMappingURL=telemetry.d.ts.map