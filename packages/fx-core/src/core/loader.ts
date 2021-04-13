// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import * as fs from "fs-extra";
import * as path from "path";
import {
  Context,
  err,
  FxError,
  ok,
  ConfigFolderName,
  Result,
  returnUserError,
  Solution,
} from "fx-api";

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
  public static PLUGIN_PREFIX = `${ConfigFolderName}-resource-`;
  public static SOLUTION_PREFIX = `${ConfigFolderName}-solution-`;

  public static async loadSelectSolution(
    ctx: Context,
    rootPath: string
  ): Promise<Result<Meta, FxError>> {
    const fp = path.resolve(`${rootPath}/.${ConfigFolderName}/settings.json`);
    if (!fs.pathExists(fp)) {
      return err(
        returnUserError(
          new Error(`FileNotFound:${fp}`),
          CoreSource,
          CoreErrorNames.FileNotFound
        )
      );
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
  public static async loadSolutions(): Promise<
    Result<Map<string, Solution & Meta>, FxError>
  > {
    const resources: Map<string, Solution & Meta> = new Map();
    const result = await Default();
    if (result.isErr()) {
      return err(result.error);
    }
    const as = Object.assign(result.value, {
      name: "fx-solution-azure",
      displayName: "azure",
      version: "1.0.0",
    });
    resources.set("fx-solution-azure", as);
    return ok(resources);
  }
}
