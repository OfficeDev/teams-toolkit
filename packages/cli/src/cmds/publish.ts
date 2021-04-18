// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { Argv, Options } from "yargs";
import * as path from "path";
import { FxError, err, ok, Result, ConfigMap, Platform, Func, Stage } from "fx-api";
import * as constants from "../constants";
import { YargsCommand } from "../yargsCommand";
import { getParamJson } from "../utils";
import { TeamsCore } from "../../../fx-core/build/core";
import { ContextFactory } from "../context";

export default class New extends YargsCommand {
    public readonly commandHead = `publish`;
    public readonly command = `${this.commandHead} [options]`;
    public readonly description = "A command to publish your Teams app";
    public readonly paramPath = constants.publishParamPath;

    public readonly params: { [_: string]: Options; } = getParamJson(this.paramPath);

    public builder(yargs: Argv): Argv<any> {
        return yargs.version(false).options(this.params);
    }

    public async runCommand(args: {
        [argName: string]: string | string[];
    }): Promise<Result<null, FxError>> {
        const answers = new ConfigMap();
        for (const name in this.params) {
            if (!args[name]) {
                continue;
            }
            if (name.endsWith("folder")) {
                answers.set(name, path.resolve(args[name] as string));
            } else {
                answers.set(name, args[name]);
            }
        }

        const manifestFolderParamName = "manifest-folder";
        let result;
        let rootFolder: string = "./"
        // if input manifestFolderParam(actually also teams-app-id param),
        // this call is from VS platform, since CLI hide these two param from users.
        if (!answers.has(manifestFolderParamName)) {
            rootFolder = answers.getString("folder")!;
            answers.delete("folder");
        }


        const core = TeamsCore.getInstance()
        if (answers.has(manifestFolderParamName)) {
            answers.set("platform", Platform.VS);
            const func: Func = {
                namespace: "fx-solution-azure",
                method: "VSpublish"
            };
            result = await core.executeUserTask(ContextFactory.get(rootFolder, Stage.publish), func, answers);
        } else {
            answers.set("platform", Platform.CLI);
            result = await core.publish(ContextFactory.get(rootFolder, Stage.publish), answers);
        }
        if (result.isErr()) {
            return err(result.error);
        }
        return ok(null);
    }
}
