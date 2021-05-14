// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";
import { Context, FxError, ok, ConfigFolderName, Result, Solution } from "@microsoft/teamsfx-api";
import { TeamsAppSolution } from "../plugins/solution/fx-solution/solution";

export interface Meta {
  name: string;
  displayName: string;
  version: string;
}

export class Loader {
  /*
   * This is our contract that each plugin & solution should follow this prefix.
   */
  public static PLUGIN_PREFIX = `${ConfigFolderName}-resource-`;
  public static SOLUTION_PREFIX = `${ConfigFolderName}-solution-`;

  // public static async loadSelectSolution(ctx: Context, rootPath: string): Promise<Result<Meta, FxError>> {

  //     const fp = path.resolve(`${rootPath}/.${ConfigFolderName}/settings.json`);
  //     if (!fs.pathExists(fp)) {
  //     return err(returnUserError(new Error(`FileNotFound:${fp}`), CoreSource, CoreErrorNames.FileNotFound));
  //     }
  //     const settings: Settings = await fs.readJSON(fp);
  //     return ok({
  //         name: settings.selectedSolution.name,
  //         displayName: settings.selectedSolution.name,
  //         version: settings.selectedSolution.version,
  //     });
  // }

  /*
   * TODO @Long
   * We implement this method with specific solutions instead of dynamically loading for 3.19.
   */
  public static async loadSolutions(
    ctx: Context
  ): Promise<Result<Map<string, Solution & Meta>, FxError>> {
    const resources: Map<string, Solution & Meta> = new Map();
    // const result = new TeamsAppSolution();
    // if (result.isErr()) {
    //     return err(result.error);
    // }
    const as = Object.assign(new TeamsAppSolution(), {
      name: "fx-solution-azure",
      displayName: "azure",
      version: "1.0.0",
    });
    resources.set("fx-solution-azure", as);
    return ok(resources);
  }
}
