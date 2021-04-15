// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { DeployConfigs, TypeNames } from "./constants";
import * as path from "path";
import * as fs from "fs-extra";
import { PreconditionException, SomethingMissingException } from "./exceptions";
import { Logger } from "./logger";
import { forEachFileAndDir } from "./utils/dir-walk";
import { Messages } from "./resources/messages";

export class DeployMgr {
    private workingDir: string;
    private deploymentDir: string;

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

        if (fs.pathExists(configFile)) {
            return;
        }

        const botDeployJson = { time: 0 };
        try {
            await fs.writeJSON(configFile, botDeployJson);
        } catch (e) {
            // If anything wrong here, don't throw exception to fail end users.
            Logger.debug(`writeJson failed with target file: ${configFile}, json: ${botDeployJson} with error: ${e}.`);
        }
    }

    public async needsToRedeploy(): Promise<boolean> {
        // Iterate all source files and config files to determine if anything changed.
        if (!this.workingDir) {
            throw new PreconditionException(Messages.WORKING_DIR_IS_MISSING, []);
        }

        const lastBotDeployTime = await this.getLastDeployTime();
        let changed = false;
        await forEachFileAndDir(this.workingDir,
            (itemPath: string, stats: fs.Stats) => {

                const relativePath = path.relative(this.workingDir, itemPath);

                if (relativePath && stats.mtime.getTime() > lastBotDeployTime) {
                    Logger.debug(`relativePath: ${relativePath}, lastBotDeployTime: ${lastBotDeployTime}, stats.mtime: ${stats.mtime.getTime()}.`);
                    changed = true;
                    // Return true to stop walking.
                    return true;
                }
            },
            (itemPath: string) => {
                return !DeployConfigs.WALK_SKIP_PATHS.find((value) => {
                    const absolutePathPrefix = path.join(this.workingDir, value);
                    return itemPath.startsWith(absolutePathPrefix);
                });
            }
        );

        return changed;
    }

    public async updateLastDeployTime(time: number): Promise<void> {
        if (!this.deploymentDir) {
            throw new SomethingMissingException(DeployConfigs.DEPLOYMENT_FOLDER);
        }

        const configFile = path.join(this.deploymentDir, DeployConfigs.DEPLOYMENT_CONFIG_FILE);
        const botDeployJson = {
            time: time
        };

        try {
            await fs.writeJson(configFile, botDeployJson);
        } catch (e) {
            // If anything wrong here, don't throw exception to fail end users.
            Logger.debug(`writeJson ${configFile} failed with error: ${e}.`);
        }
    }

    public async getLastDeployTime(): Promise<number> {

        if (!this.deploymentDir) {
            throw new SomethingMissingException(DeployConfigs.DEPLOYMENT_FOLDER);
        }

        const configFile = path.join(this.deploymentDir, DeployConfigs.DEPLOYMENT_CONFIG_FILE);
        let botDeployJson = undefined;
        try {
            botDeployJson = await fs.readJSON(configFile);
        } catch (e) {
            Logger.debug(`readJson ${configFile} failed with error: ${e}.`);
            return 0;
        }

        if (!botDeployJson || !botDeployJson.time ||
            typeof botDeployJson.time !== TypeNames.NUMBER || botDeployJson.time < 0
        ) {
            return 0;
        }

        return botDeployJson.time;
    }
}