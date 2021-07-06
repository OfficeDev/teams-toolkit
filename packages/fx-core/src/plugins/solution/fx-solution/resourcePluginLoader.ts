// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {AzureSolutionSettings, FxError, Result, Plugin, ok, err} from "@microsoft/teamsfx-api";

/**
 * 1: add import statement
 */
import {SpfxPlugin} from "../../resource/spfx";
import {FrontendPlugin} from "../../resource/frontend";
import {IdentityPlugin} from "../../resource/identity";
import {SqlPlugin} from "../../resource/sql";
import {TeamsBot} from "../../resource/bot";
import {AadAppForTeamsPlugin} from "../../resource/aad";
import {FunctionPlugin} from "../../resource/function";
import {SimpleAuthPlugin} from "../../resource/simpleauth";
import {LocalDebugPlugin} from "../../resource/localdebug";
import {ApimPlugin} from "../../resource/apim";
import {AppStudioPlugin} from "../../resource/appstudio";
 
/**
 * 2: add new plugin statement
 */
export async function createAllResourcePlugins():Promise<Result<Plugin[],FxError>>{
  const plugins: Plugin[] = [
      new SpfxPlugin()
      , new FrontendPlugin()
      , new IdentityPlugin()
      , new SqlPlugin()
      , new TeamsBot()
      , new AadAppForTeamsPlugin()
      , new FunctionPlugin()
      , new SimpleAuthPlugin()
      , new LocalDebugPlugin()
      , new ApimPlugin()
      , new AppStudioPlugin()
    ];
  return ok(plugins);
}


export async function getResourcePlugin(name:string):Promise<Result<Plugin|undefined,FxError>>{
  const res1 = await createAllResourcePlugins();
  if(res1.isErr()) return err(res1.error);
  const res = res1.value.filter(p=>p.name === name);
  if(res.length > 0)
    return ok(res[0]);
  return ok(undefined);
}

export async function loadActivatedResourcePlugins(solutionSettings: AzureSolutionSettings):Promise<Result<Plugin[],FxError>> {
  const res1 = await createAllResourcePlugins();
  if(res1.isErr()) return err(res1.error);
  const allPlugins = res1.value;
  let activatedPlugins:Plugin[] = [];
  if(solutionSettings.activeResourcePlugins && solutionSettings.activeResourcePlugins.length > 0) // load existing config
    activatedPlugins = allPlugins.filter(p=>p.name && solutionSettings.activeResourcePlugins.includes(p.name));
  else // create from zero
    activatedPlugins = allPlugins.filter(p=>p.activate && p.activate(solutionSettings) === true);
  return ok(activatedPlugins);
}
