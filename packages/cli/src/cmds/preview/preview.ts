// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import * as path from "path";
import { Argv } from "yargs";
import { YargsCommand } from "../../yargsCommand";
import { err, FxError, ok, Result } from "@microsoft/teamsfx-api";

import * as utils from "../../utils";
import * as commonUtils from "./commonUtils";
import * as constants from "./constants";
import { CliTelemetry } from "../../telemetry/cliTelemetry";
import { ExclusiveLocalRemoteOptions, WorkspaceNotSupported } from "./errors";

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
        const includeFrontend = activeResourcePlugins.some((pluginName) => pluginName === constants.FrontendHostingPluginName);
        const includeBackend = activeResourcePlugins.some((pluginName) => pluginName === constants.FunctionPluginName);
        const includeBot = activeResourcePlugins.some((pluginName) => pluginName === constants.BotPluginName);

        if (includeBot) {
            // TODO: start ngrok
        }

        // TODO: prepare dev env

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
