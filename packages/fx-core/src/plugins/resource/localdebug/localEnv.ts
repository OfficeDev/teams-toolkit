// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import * as dotenv from "dotenv";
import * as fs from "fs-extra";
import * as os from "os";
import { ConfigFolderName } from "fx-api";

import { LocalEnvFrontendKeys, LocalEnvBackendKeys, LocalEnvAuthKeys, LocalEnvBotKeys } from "./constants";

export class LocalEnvProvider {
    private readonly localEnvFilePath: string;
    constructor(workspaceFolder: string) {
        this.localEnvFilePath = `${workspaceFolder}/.${ConfigFolderName}/local.env`;
    }

    public async loadLocalEnv(includeFrontend: boolean, includeBackend: boolean, includeBot: boolean): Promise<{ [name: string]: string }> {
        if (await fs.pathExists(this.localEnvFilePath)) {
            return dotenv.parse(await fs.readFile(this.localEnvFilePath));
        } else {
            return this.initialLocalEnvs(includeFrontend, includeBackend, includeBot);
        }
    }

    public async saveLocalEnv(envs: { [name: string]: string } | undefined): Promise<void> {
        await fs.createFile(this.localEnvFilePath);
        await fs.writeFile(this.localEnvFilePath, "");
        if (envs) {
            const entries = Object.entries(envs);
            for (const [key, value] of entries) {
                await fs.appendFile(this.localEnvFilePath, `${key}=${value}${os.EOL}`);
            }
        }
    }

    public initialLocalEnvs(includeFrontend: boolean, includeBackend: boolean, includeBot: boolean): { [name: string]: string } {
        const localEnvs: { [name: string]: string } = {};
        let keys: string[];

        if (includeFrontend) {
            // auth is only required by frontend
            keys = Object.values(LocalEnvAuthKeys);
            for (const key of keys) {
                // initial with empty string
                localEnvs[key] = "";
            }
            // setup const environment variables
            localEnvs[LocalEnvAuthKeys.Urls] = "http://localhost:5000";

            keys = Object.values(LocalEnvFrontendKeys);
            for (const key of keys) {
                // initial with empty string
                localEnvs[key] = "";
            }

            // setup const environment variables
            localEnvs[LocalEnvFrontendKeys.Browser] = "none";
            localEnvs[LocalEnvFrontendKeys.Https] = "true";

            if (includeBackend) {
                keys = Object.values(LocalEnvBackendKeys);
                for (const key of keys) {
                    // initial with empty string
                    localEnvs[key] = "";
                }

                // setup const environment variables
                localEnvs[LocalEnvBackendKeys.FuncWorkerRuntime] = "node";
            }
        }

        if (includeBot) {
            keys = Object.values(LocalEnvBotKeys);
            for (const key of keys) {
                // initial with empty string
                localEnvs[key] = "";
            }
        }

        return localEnvs;
    }
}