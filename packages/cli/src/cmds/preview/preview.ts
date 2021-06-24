// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import * as path from "path";
import * as fs from "fs-extra";
import { Argv } from "yargs";
import { YargsCommand } from "../../yargsCommand";
import { err, FxError, Inputs, ok, Platform, Result } from "@microsoft/teamsfx-api";

import * as utils from "../../utils";
import * as commonUtils from "./commonUtils";
import * as constants from "./constants";
import { CliTelemetry } from "../../telemetry/cliTelemetry";
import { ExclusiveLocalRemoteOptions, PreviewCommandFailed, RequiredPathNotExists, WorkspaceNotSupported } from "./errors";
import activate from "../../activate";
import { Task } from "./task";
import DialogManagerInstance from "../../userInterface";

export default class Preview extends YargsCommand {
    public readonly commandHead = `preview`;
    public readonly command = `${this.commandHead}`;
    public readonly description = "Preview the current application.";

    public builder(yargs: Argv): Argv<any> {
        yargs.option("local", {
            description: "Preview the application from local, exclusive with --remote",
            boolean: true,
            default: false,
        });
        yargs.option("remote", {
            description: "Preview the application from remote, exclusive with --local",
            boolean: true,
            default: false,
        });
        yargs.option("folder", {
            description: "Select root folder of the project",
            string: true,
            default: "./",
        });

        return yargs.version(false);
    }

    public async runCommand(args: { [argName: string]: boolean | string | string[] | undefined }): Promise<Result<null, FxError>> {
        if (args.local && args.remote) {
            return err(ExclusiveLocalRemoteOptions());
        }

        const workspaceFolder = path.resolve(args.folder as string);
        if (!utils.isWorkspaceSupported(workspaceFolder)) {
            return err(WorkspaceNotSupported(workspaceFolder));
        }

        CliTelemetry.setReporter(CliTelemetry.getReporter().withRootFolder(workspaceFolder));

        if (args.local || (!args.local && !args.remote)) {
            return await this.localPreview(workspaceFolder);
        }
        return await this.remotePreview(workspaceFolder);
    }

    private async localPreview(workspaceFolder: string): Promise<Result<null, FxError>> {
        // TODO: check dependencies

        const activeResourcePlugins = await commonUtils.getActiveResourcePlugins(workspaceFolder);
        const includeFrontend = activeResourcePlugins.some((pluginName) => pluginName === constants.frontendHostingPluginName);
        const includeBackend = activeResourcePlugins.some((pluginName) => pluginName === constants.functionPluginName);
        const includeBot = activeResourcePlugins.some((pluginName) => pluginName === constants.botPluginName);

        if (includeBot) {
            // TODO: start ngrok
        }

        /* === prepare dev env === */
        const result = await activate();
        if (result.isErr()) {
            // TODO: telemetry
            return err(result.error);
        }
        const core = result.value;

        let frontendInstallTask: Task | undefined;
        if (includeFrontend) {
            const frontendRoot = path.join(workspaceFolder, constants.frontendFolderName);
            if (!(await fs.pathExists(frontendRoot))) {
                return err(RequiredPathNotExists(frontendRoot));
            }
            frontendInstallTask = new Task(constants.npmInstallCommand, {
                cwd: frontendRoot,
            });
        }

        let backendInstallTask: Task | undefined;
        if (includeBackend) {
            const backendRoot = path.join(workspaceFolder, constants.backendFolderName);
            if (!(await fs.pathExists(backendRoot))) {
                return err(RequiredPathNotExists(backendRoot));
            }
            backendInstallTask = new Task(constants.npmInstallCommand, {
                cwd: backendRoot,
            });
        }

        const inputs: Inputs = {
            projectPath: workspaceFolder,
            platform: Platform.CLI,
        };

        const frontendInstallBar = DialogManagerInstance.createProgressBar(constants.frontendInstallTitle, 1);
        const frontendInstallStartCb = commonUtils.createNpmInstallStartCb(frontendInstallBar, constants.frontendInstallStartMessage);
        const frontendInstallStopCb = commonUtils.createNpmInstallStopCb(constants.frontendInstallTitle, frontendInstallBar, constants.frontendInstallSuccessMessage);

        const backendInstallBar = DialogManagerInstance.createProgressBar(constants.backendInstallTitle, 1);
        const backendInstallStartCb = commonUtils.createNpmInstallStartCb(backendInstallBar, constants.backendInstallStartMessage);
        const backendInstallStopCb = commonUtils.createNpmInstallStopCb(constants.backendInstallTitle, backendInstallBar, constants.backendInstallSuccessMessage);
        
        const results = await Promise.all([
            core.localDebug(inputs),
            frontendInstallTask?.wait(frontendInstallStartCb, frontendInstallStopCb),
            backendInstallTask?.wait(backendInstallStartCb, backendInstallStopCb)
        ]);
        const errors: FxError[] = [];
        for (const result of results) {
            if (result?.isErr()) {
                errors.push(result.error);
            }
        }
        if (errors.length > 0) {
            return err(PreviewCommandFailed(errors));
        }

        // TODO: check ports

        // TODO: start services

        // TODO: get local teams app id

        // TODO: open teams web client

        return ok(null);
    }

    private async remotePreview(workspaceFolder: string): Promise<Result<null, FxError>> {
        // TODO: get remote teams app id

        // TODO: open teams web client

        return ok(null);
    }
}
