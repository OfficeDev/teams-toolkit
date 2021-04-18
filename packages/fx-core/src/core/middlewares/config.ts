// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import * as fs from "fs-extra";
import { HookContext, NextFunction, Middleware } from "@feathersjs/hooks";
import { err,  ConfigFolderName} from "fx-api";
import * as error from "../error";
import { CoreContext } from "../context";
 
/**
 * This middleware will help to persist configs if necessary.
 */
export const writeConfigMW: Middleware = async (
  ctx: HookContext,
  next: NextFunction
) => {
  await next();
  
  const coreCtx: CoreContext = ctx.arguments[0] as CoreContext;
  
  try { 
    const configFolder = `${coreCtx.projectPath}/.${ConfigFolderName}`;
    
    await fs.writeFile(  `${configFolder}/settings.json`, JSON.stringify(coreCtx.projectSettings, null, 4)  );

    await fs.writeFile(  `${configFolder}/states.json`, JSON.stringify(coreCtx.projectStates, null, 4)  );

    const env = coreCtx.env;
    if(env){

      // provision,deploy template
      const resources = coreCtx.projectSettings.solutionSettings?.resources;
      if(env && resources && resources.length > 0){
        for(const resource of resources){
          if(coreCtx.provisionTemplates)
            await fs.writeFile(`${configFolder}/${env.name}.provision.tpl.json`, JSON.stringify(coreCtx.provisionTemplates[resource], null, 4));
          if(coreCtx.deployTemplates)
           await fs.writeFile(`${configFolder}/${env.name}.deploy.tpl.json`, JSON.stringify(coreCtx.deployTemplates[resource], null, 4));
        }
      }
  
      //env.userdata
      const varDict = coreCtx.variableDict;
      if(varDict){
        varDict.name = env.name;
        varDict.local = env.local;
        varDict.sideloading = env.sideloading;
        await fs.writeFile(`${configFolder}/${env.name}.userdata`, JSON.stringify(varDict, null, 4));
      }
    }
  } catch (e) {
    ctx.result = err(error.ReadFileError(e));
    return;
  }
};
