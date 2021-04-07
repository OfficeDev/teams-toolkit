// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { LogProvider } from "fx-api";

import { FrontendPluginInfo } from "../constants";

export class Logger {
    static logger: LogProvider | undefined;

    public static setLogger(_logger?: LogProvider): void {
        this.logger = _logger;
    }

    public static debug(message: string): void {
        this.logger?.debug(`[${FrontendPluginInfo.DisplayName}] ${message}`);
    }

    public static info(message: string): void {
        this.logger?.info(`[${FrontendPluginInfo.DisplayName}] ${message}`);
    }

    public static warning(message: string): void {
        this.logger?.warning(`[${FrontendPluginInfo.DisplayName}] ${message}`);
    }

    public static error(message: string): void {
        this.logger?.error(`[${FrontendPluginInfo.DisplayName}] ${message}`);
    }
}
