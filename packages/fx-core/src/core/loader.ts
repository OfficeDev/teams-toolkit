// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import * as fs from "fs-extra";
import * as path from "path";
import { Context, err, FxError, ok, ProductName, Result, returnUserError, Solution} from "teamsfx-api";

import { Settings } from "./settings";

import { Default } from "../plugins/solution/fx-solution";
import { CoreErrorNames, CoreSource } from "./error";

export interface Meta {
    name: string;
    displayName: string;
    version: string;
}

export class Loader {
    /*
     * This is our contract that each plugin & solution should follow this prefix.
     */
    public static PLUGIN_PREFIX = `${ProductName}-resource-`;
    public static SOLUTION_PREFIX = `${ProductName}-solution-`;

    public static async loadSelectSolution(ctx: Context, rootPath: string): Promise<Result<Meta, FxError>> {
        
        const fp = path.resolve(`${rootPath}/.${ProductName}/settings.json`);
        if (!fs.pathExists(fp)) {
        return err(returnUserError(new Error(`FileNotFound:${fp}`), CoreSource, CoreErrorNames.FileNotFound));
        }
        const settings: Settings = await fs.readJSON(fp);
        return ok({
            name: settings.selectedSolution.name,
            displayName: settings.selectedSolution.name,
            version: settings.selectedSolution.version,
        });
    }

    /*
     * TODO @Long
     * We implement this method with specific solutions instead of dynamically loading for 3.19.
     */
    public static async loadSolutions(ctx: Context): Promise<Result<Map<string, Solution & Meta>, FxError>> {
        const resources: Map<string, Solution & Meta> = new Map();
        const result = await Default();
        if (result.isErr()) {
            return err(result.error);
        }
        const as = Object.assign(result.value, {
            name: "teamsfx-solution-azure",
            displayName: "azure",
            version: "1.0.0",
        });
        resources.set("teamsfx-solution-azure", as);
        return ok(resources);
    }
}
