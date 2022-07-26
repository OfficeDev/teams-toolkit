// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  Action,
  ContextV3,
  Effect,
  err,
  FunctionAction,
  FxError,
  InputsWithProjectPath,
  MaybePromise,
  ok,
  Result,
} from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Service } from "typedi";
import { getComponent, runActionByName } from "../workflow";
import "../connection/azureWebAppConfig";
import "../resource/azureSql";
import "../resource/identity";
import { ComponentNames } from "../constants";
import { hasApi } from "../../common/projectSettingsHelperV3";
import { UtilFunctions } from "../resource/azureSql/actions/configure";
import { cloneDeep, assign } from "lodash";
import { Plans } from "../messages";
import { generateConfigBiceps } from "../utils";

@Service("sql")
export class Sql {
  name = "sql";

  add(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: FunctionAction = {
      name: "sql.add",
      type: "function",
      execute: async (context, inputs) => {
        const sqlComponent = getComponent(context.projectSetting, ComponentNames.AzureSQL);
        const provisionType = sqlComponent ? "database" : "server";
        const effects: Effect[] = [];

        const hasFunc = hasApi(context.projectSetting);
        // 1. call teams-api.add if necessary
        if (!hasFunc) {
          const res = await runActionByName("teams-api.add", context, inputs);
          if (res.isErr()) return err(res.error);
          effects.push("add teams-api");
        }

        // 2. sql.generateBicep
        {
          const clonedInputs = cloneDeep(inputs);
          assign(clonedInputs, {
            provisionType: provisionType,
          });
          const res = await runActionByName("azure-sql.generateBicep", context, clonedInputs);
          if (res.isErr()) return err(res.error);
        }

        // 3. sql config
        context.projectSetting.components.push({
          name: ComponentNames.AzureSQL,
          provision: true,
        });
        effects.push(Plans.generateBicepAndConfig(ComponentNames.AzureSQL));

        // 4. update config bicep
        {
          const res = await generateConfigBiceps(context, inputs);
          if (res.isErr()) return err(res.error);
          effects.push("generate config biceps");
        }
        return ok(effects);
      },
    };
    return ok(action);
  }
}

// TODO: move it to provision flow
const cliHelpAction: Action = {
  name: "fx.sqlCliHelp",
  type: "function",
  question: (context: ContextV3, inputs: InputsWithProjectPath) => {
    return ok(UtilFunctions.buildQuestionNode());
  },
  execute: async (context: ContextV3, inputs: InputsWithProjectPath) => {
    return ok([]);
  },
};
