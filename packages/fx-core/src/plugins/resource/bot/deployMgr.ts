// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { DeployConfigs, TypeNames } from "./constants";
import * as path from "path";
import * as fs from "fs-extra";
import { PreconditionError, SomethingMissingError } from "./errors";
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
        await fs.ensureDir(this.deploymentDir);

        const configFile = path.join(this.deploymentDir, DeployConfigs.DEPLOYMENT_CONFIG_FILE);

        if (await fs.pathExists(configFile)) {
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
            throw new PreconditionError(Messages.WorkingDirIsMissing, []);
        }

        const lastBotDeployTime = await this.getLastDeployTime();
        let changed = false;
        await forEachFileAndDir(this.workingDir,
            (itemPath: string, stats: fs.Stats) => {

                const relativePath = path.relative(this.workingDir, itemPath);

                if (relativePath && stats.mtime.getTime() > lastBotDeployTime) {
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
            throw new SomethingMissingError(DeployConfigs.DEPLOYMENT_FOLDER);
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
            throw new SomethingMissingError(DeployConfigs.DEPLOYMENT_FOLDER);
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