// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { Argv, Options } from "yargs";
import * as path from "path";
import { FxError, err, ok, Result, ConfigMap, Platform, Func, Stage } from "fx-api";
import * as constants from "../constants";
import { YargsCommand } from "../yargsCommand";
import { getParamJson } from "../utils";
import { ContextFactory } from "../context";
import activate from "../activate";

export default class New extends YargsCommand {
    public readonly commandHead = `build`;
    public readonly command = `${this.commandHead} [options]`;
    public readonly description = "A command to build your Teams app";
    public readonly paramPath = constants.buildParamPath;

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

        const rootFolder = answers.getString("folder");
        answers.delete("folder");
        answers.set("platform", Platform.CLI);
        const core = await activate();
        {
            const func: Func = {
                namespace: "fx-solution-azure",
                method: "buildPackage"
            };
            const result = await core.executeUserTask!(ContextFactory.get(
                rootFolder!, Stage.userTask), func, answers);
            if (result.isErr()) {
                return err(result.error);
            }
        }

        return ok(null);
    }
}
