// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as fs from "fs-extra";

const codespaceEnvConfig = "/workspaces/.codespaces/shared/environment-variables.json";

export async function getCodespaceName(): Promise<string> {
    try {
        const codespaceEnv = await fs.readJSON(codespaceEnvConfig);
        return codespaceEnv.CODESPACE_NAME;
    } catch (error) {
        throw new Error(`Failed to read environment variables for codespace from file: ${codespaceEnvConfig}`);
    }
}

export function getCodespaceUrl(codespaceName: string, port: number) {
    return `https://${codespaceName}-${port}.githubpreview.dev`;
}