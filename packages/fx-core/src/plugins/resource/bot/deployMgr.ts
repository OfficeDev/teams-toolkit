// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { DeployConfigs } from "./constants";
import * as path from "path";
import * as fs from "fs-extra";
import { SomethingMissingException } from "./exceptions";
import { Logger } from "./logger";

export class DeployMgr {
    private workingDir?: string;
    private deploymentDir?: string;

    public constructor(workingDir: string) {
        this.workingDir = workingDir;
        this.deploymentDir = path.join(workingDir, DeployConfigs.DEPLOYMENT_FOLDER);
    }

    public async init(): Promise<void> {
        if (!this.deploymentDir) {
            throw new SomethingMissingException(DeployConfigs.DEPLOYMENT_FOLDER);
        }

        await fs.ensureDir(this.deploymentDir);

        const configFile = path.join(this.deploymentDir, DeployConfigs.DEPLOYMENT_CONFIG_FILE);

        const botDeployJson = {};
        try {
            await fs.writeJSON(configFile, botDeployJson);
        } catch (e) {
            // If anything wrong here, don't throw exception to fail end users.
            Logger.debug(`writeJson failed with target file: ${configFile}, json: ${botDeployJson} with error: ${e}.`);
        }
    }

    public async needsToRedeploy(): Promise<boolean> {
        const lastDeployTime = await this.getLastDeployTime();
        const currentChangeTime = await this.getCurrentChangeTime();

        Logger.debug(`lastDeployTime: ${lastDeployTime}.`);
        Logger.debug(`currentChangeTime: ${currentChangeTime}.`);

        return currentChangeTime > lastDeployTime;
    }

    private async getCurrentChangeTime(): Promise<Date> {
        // Iterate all source files and config files to get the biggest timestamp.


    }

    private async getLastDeployTime(): Promise<Date> {

        if (!this.deploymentDir) {
            throw new SomethingMissingException(DeployConfigs.DEPLOYMENT_FOLDER);
        }

        const configFile = path.join(this.deploymentDir, DeployConfigs.DEPLOYMENT_CONFIG_FILE);
        let botDeployJson = undefined;
        try {
            botDeployJson = await fs.readJSON(configFile);
        } catch (e) {
            Logger.debug(`readJson ${configFile} failed with error: ${e}.`);
        }

        if (!botDeployJson || !botDeployJson.time) {
            return new Date(0);
        }

        return botDeployJson.time;
    }


}