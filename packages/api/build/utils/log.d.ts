export declare enum LogLevel {
    /**
     * Contain the most detailed messages.
     */
    Trace = 0,
    /**
     * For debugging and development.
     */
    Debug = 1,
    /**
     * Tracks the general flow of the app. May have long-term value.
     */
    Info = 2,
    /**
     * For abnormal or unexpected events. Typically includes errors or conditions that don't cause the app to fail.
     */
    Warning = 3,
    /**
     * For errors and exceptions that cannot be handled. These messages indicate a failure in the current operation or request, not an app-wide failure.
     */
    Error = 4,
    /**
     * For failures that require immediate attention. Examples: data loss scenarios.
     */
    Fatal = 5
}
export interface LogProvider {
    /**
     * Use to record information
     * @param logLevel Defines logging severity levels.
     * @param message Information of log event
     */
    log(logLevel: LogLevel, message: string): Promise<boolean>;
    /**
     * Use to record trace information
     * @param message Information of log event
     */
    trace(message: string): Promise<boolean>;
    /**
     * Use to record debug information
     * @param message Information of log event
     */
    debug(message: string): Promise<boolean>;
    /**
     * Use to record info information
     * @param message Information of log event
     */
    info(message: string): Promise<boolean>;
    /**
     * Use to record warning information
     * @param message Information of log event
     */
    warning(message: string): Promise<boolean>;
    /**
     * Use to record error information
     * @param message Information of log event
     */
    error(message: string): Promise<boolean>;
    /**
     * Use to record critical information
     * @param message Information of log event
     */
    fatal(message: string): Promise<boolean>;
}
//# sourceMappingURL=log.d.ts.map