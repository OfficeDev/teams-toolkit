// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { ConfigMap, PluginContext } from "teamsfx-api";
import { ResourceGroups, ResourceManagementClientContext } from "@azure/arm-resources";
import { ServiceClientCredentials } from "@azure/ms-rest-js";

import * as utils from "../../../../../src/plugins/resource/bot/utils/common";
import { PluginAAD, PluginSolution } from "../../../../../src/plugins/resource/bot/resources/strings";

export async function ensureResourceGroup(rgName: string, creds: ServiceClientCredentials, subs: string): Promise<void> {
    const client = new ResourceGroups(new ResourceManagementClientContext(creds, subs));
    const res = await client.createOrUpdate(rgName, {
        location: "Central US",
    });
    if (!res || (res._response.status !== 201 && res._response.status !== 200)) {
        throw new Error(`Fail to ensure resource group with name: ${rgName}`);
    }
}

export function newPluginContext(): PluginContext {
    return {
        root: "",
        configOfOtherPlugins: new Map<string, Map<string, string>>([
            [
                PluginAAD.PLUGIN_NAME,
                new Map<string, string>([
                    [PluginAAD.CLIENT_ID, utils.genUUID()],
                    [PluginAAD.CLIENT_SECRET, utils.genUUID()],
                ]),
            ],
            [PluginSolution.PLUGIN_NAME, new Map<string, string>([[PluginSolution.TENANT_ID, utils.genUUID()], [PluginSolution.LOCATION, "Central US"]])],
        ]),
        config: new ConfigMap(),
        answers: new ConfigMap(),
        app: {
            manifestVersion: "1.8",
            version: "1.0.0",
            id: "{appId}",
            developer: {
                name: "Teams App, Inc.",
                mpnId: "",
                websiteUrl: "https://localhost:3000",
                privacyUrl: "https://localhost:3000/privacy",
                termsOfUseUrl: "https://localhost:3000/termsofuse",
            },
            name: {
                short: "",
            },
            description: {
                short: "Short description for {appName}.",
                full: "Full description of {appName}.",
            },
            icons: {
                outline: "",
                color: "",
            },
            accentColor: "",
        },
    };
}