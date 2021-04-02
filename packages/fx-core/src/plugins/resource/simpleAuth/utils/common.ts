// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { ConfigValue, LogProvider, PluginContext } from "teamsfx-api";
import * as path from "path";
import { Constants, Message } from "../constants";
import { NoConfigError } from "../errors";
import { ResultFactory } from "../result";
import { TelemetryUtils } from "./telemetry";

export class Utils {
    public static generateResourceName(appName: string, resourceNameSuffix: string): string {
        const paddingLength =
            Constants.ResourceNameMaxLength - resourceNameSuffix.length - Constants.SimpleAuthSuffix.length;
        const normalizedAppName = appName.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
        return normalizedAppName.substr(0, paddingLength) + Constants.SimpleAuthSuffix + resourceNameSuffix;
    }

    public static getSimpleAuthFilePath(): string {
        return path.join(__dirname, "..", Constants.ResourcesFolderName, Constants.SimpleAuthFileName);
    }

    public static getWebAppConfig(ctx: PluginContext, isLocalDebug: boolean): { [propertyName: string]: string } {
        const clientId = Utils.getConfigValueWithValidation(
            ctx,
            Constants.AadAppPlugin.id,
            Constants.AadAppPlugin.configKeys.clientId,
            isLocalDebug,
        ) as string;
        const clientSecret = Utils.getConfigValueWithValidation(
            ctx,
            Constants.AadAppPlugin.id,
            Constants.AadAppPlugin.configKeys.clientSecret,
            isLocalDebug,
        ) as string;
        const oauthTokenEndpointBase = Utils.getConfigValueWithValidation(
            ctx,
            Constants.AadAppPlugin.id,
            Constants.AadAppPlugin.configKeys.oauthAuthority,
        ) as string;
        const applicationIdUris = Utils.getConfigValueWithValidation(
            ctx,
            Constants.AadAppPlugin.id,
            Constants.AadAppPlugin.configKeys.applicationIdUris,
            isLocalDebug,
        ) as string;
        const teamsMobileDesktopAppId = Utils.getConfigValueWithValidation(
            ctx,
            Constants.AadAppPlugin.id,
            Constants.AadAppPlugin.configKeys.teamsMobileDesktopAppId,
        ) as string;
        const teamsWebAppId = Utils.getConfigValueWithValidation(
            ctx,
            Constants.AadAppPlugin.id,
            Constants.AadAppPlugin.configKeys.teamsWebAppId,
        ) as string;

        const oauthTokenEndpoint = `${oauthTokenEndpointBase}/oauth2/v2.0/token`;
        const allowedAppIds = [teamsMobileDesktopAppId, teamsWebAppId].join(";");

        return {
            [Constants.ApplicationSettingsKeys.clientId]: clientId,
            [Constants.ApplicationSettingsKeys.clientSecret]: clientSecret,
            [Constants.ApplicationSettingsKeys.oauthTokenEndpoint]: oauthTokenEndpoint,
            [Constants.ApplicationSettingsKeys.applicationIdUris]: applicationIdUris,
            [Constants.ApplicationSettingsKeys.allowedAppIds]: allowedAppIds,
        };
    }

    public static addLocalDebugPrefix(isLocalDebug: boolean, key: string) {
        return isLocalDebug ? Constants.LocalPrefix + key : key;
    }

    public static addLogAndTelemetry(logProvider: LogProvider | undefined, message: Message) {
        logProvider?.info(message.log);
        TelemetryUtils.sendEvent(message.telemetry);
    }

    public static getConfigValueWithValidation(
        ctx: PluginContext,
        pluginId: string,
        configKey: string,
        isLocalDebug = false,
    ) {
        const key = Utils.addLocalDebugPrefix(isLocalDebug, configKey);
        const configValue = ctx.configOfOtherPlugins.get(pluginId)?.get(key);
        if (!configValue) {
            throw ResultFactory.SystemError(NoConfigError.name, NoConfigError.message(pluginId, key));
        }
        return configValue;
    }
}
