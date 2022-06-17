// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  Action,
  ContextV3,
  FxError,
  InputsWithProjectPath,
  MaybePromise,
  ok,
  Result,
} from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import * as path from "path";
import "reflect-metadata";
import { Service } from "typedi";
import { environmentManager } from "../core/environment";

@Service("env-manager")
export class EnvManager {
  readonly name = "env-manager";
  create(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      name: "env-manager.create",
      type: "function",
      plan: async (context: ContextV3, inputs: InputsWithProjectPath) => {
        const envName = inputs.envName || environmentManager.getDefaultEnvName();
        const envConfigPath = path.join(
          inputs.projectPath,
          ".fx",
          "configs",
          `config.${envName}.json`
        );
        return ok([
          {
            type: "file",
            filePath: envConfigPath,
            operate: "create",
            remarks: "env config",
          },
        ]);
      },
      execute: async (context: ContextV3, inputs: InputsWithProjectPath) => {
        const envName = inputs.envName || environmentManager.getDefaultEnvName();
        const envConfig = environmentManager.newEnvConfigData(
          context.projectSetting.appName,
          undefined
        );
        const envConfigPath = path.join(
          inputs.projectPath,
          ".fx",
          "configs",
          `config.${envName}.json`
        );
        await fs.ensureDir(path.join(inputs.projectPath, ".fx", "configs"));
        await fs.writeFile(envConfigPath, JSON.stringify(envConfig, null, 4));
        return ok([
          {
            type: "file",
            filePath: envConfigPath,
            operate: "create",
            remarks: "env config",
          },
        ]);
      },
    };
    return ok(action);
  }
  // read(
  //   context: ContextV3,
  //   inputs: InputsWithProjectPath
  // ): MaybePromise<Result<Action | undefined, FxError>> {
  //   const action: Action = {
  //     type: "function",
  //     name: "env-manager.read",
  //     plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
  //       return ok([]);
  //     },
  //     execute: async (context: ContextV3, inputs: InputsWithProjectPath) => {
  //       const envName = inputs.targetEnvName;
  //       const envInfoRes = await loadEnvInfoV3(inputs, context.projectSetting, envName);
  //       if (envInfoRes.isErr()) return err(envInfoRes.error);
  //       context.envInfo = envInfoRes.value;
  //       return ok([]);
  //     },
  //   };
  //   return ok(action);
  // }
  // write(
  //   context: ContextV3,
  //   inputs: InputsWithProjectPath
  // ): MaybePromise<Result<Action | undefined, FxError>> {
  //   const action: Action = {
  //     type: "function",
  //     name: "env-manager.write",
  //     plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
  //       if (context.envInfo?.state) {
  //         const envStatePath = path.join(
  //           inputs.projectPath,
  //           "states",
  //           `state.${context.envInfo.envName}.json`
  //         );
  //         const userDataPath = path.join(
  //           inputs.projectPath,
  //           "states",
  //           `${context.envInfo.envName}.userdata`
  //         );
  //         return ok(createFilesEffects([envStatePath, userDataPath], "replace", "env state"));
  //       }
  //       return ok([]);
  //     },
  //     execute: async (context: ContextV3, inputs: InputsWithProjectPath) => {
  //       if (context.envInfo?.state) {
  //         const envStatePath = path.join(
  //           inputs.projectPath,
  //           "states",
  //           `state.${context.envInfo.envName}.json`
  //         );
  //         const userDataPath = path.join(
  //           inputs.projectPath,
  //           "states",
  //           `${context.envInfo.envName}.userdata`
  //         );
  //         const effects = createFilesEffects([envStatePath, userDataPath], "replace", "env state");
  //         for (const key of Object.keys(context.envInfo.state)) {
  //           if (key !== "solution") {
  //             const cloudResource = Container.get(key) as CloudResource;
  //             if (cloudResource.finalOutputKeys) {
  //               const config = context.envInfo.state[key];
  //               for (const configKey of Object.keys(config)) {
  //                 if (!cloudResource.finalOutputKeys.includes(configKey)) {
  //                   delete config[configKey];
  //                 }
  //               }
  //             }
  //           }
  //         }
  //         const writeEnvStateRes = await environmentManager.writeEnvState(
  //           context.envInfo.state,
  //           inputs.projectPath,
  //           new LocalCrypto(context.projectSetting.projectId),
  //           context.envInfo.envName,
  //           true
  //         );
  //         if (writeEnvStateRes.isErr()) return err(writeEnvStateRes.error);
  //         return ok(effects);
  //       }
  //       return ok([]);
  //     },
  //   };
  //   return ok(action);
  // }
}
