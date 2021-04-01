// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { LogProvider } from 'teamsfx-api';

import { FrontendPluginInfo } from '../constants';

export class Logger {
    static logger: LogProvider | undefined;

    public static setLogger(_logger?: LogProvider) {
        this.logger = _logger;
    }

    public static debug(message: string) {
        this.logger?.debug(`[${FrontendPluginInfo.DisplayName}] ${message}`);
    }

    public static info(message: string) {
        this.logger?.info(`[${FrontendPluginInfo.DisplayName}] ${message}`);
    }

    public static warning(message: string) {
        this.logger?.warning(`[${FrontendPluginInfo.DisplayName}] ${message}`);
    }

    public static error(message: string) {
        this.logger?.error(`[${FrontendPluginInfo.DisplayName}] ${message}`);
    }
}
