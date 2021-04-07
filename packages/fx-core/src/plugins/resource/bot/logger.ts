// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { LogProvider } from "fx-api";

export class Logger {
    static logger: LogProvider | undefined;

    public static setLogger(_logger?: LogProvider): void {
        this.logger = _logger;
    }

    public static debug(message: string): void {
        this.logger?.debug(message);
    }

    public static info(message: string): void {
        this.logger?.info(message);
    }

    public static warning(message: string): void {
        this.logger?.warning(message);
    }

    public static error(message: string): void {
        this.logger?.error(message);
    }
}
