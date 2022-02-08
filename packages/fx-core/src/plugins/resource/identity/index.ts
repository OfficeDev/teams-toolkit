import * as path from "path";
import {
  PluginContext,
  Plugin,
  ok,
  AzureSolutionSettings,
  Func,
  Result,
  FxError,
} from "@microsoft/teamsfx-api";
import { IdentityBicep, IdentityBicepFile } from "./constants";
import { getTemplatesFolder } from "../../../folder";
import { HostTypeOptionAzure } from "../../solution/fx-solution/question";
import { Service } from "typedi";
import {
  ResourcePlugins,
  getActivatedV2ResourcePlugins,
} from "../../solution/fx-solution/ResourcePluginContainer";
import { Bicep } from "../../../common/constants";
import { ArmTemplateResult } from "../../../common/armInterface";
import { NamedArmResourcePluginAdaptor } from "../../solution/fx-solution/v2/adaptor";
import { generateBicepFromFile } from "../../../common/tools";
import "./v2";
import "./v3";
@Service(ResourcePlugins.IdentityPlugin)
export class IdentityPlugin implements Plugin {
  name = "fx-resource-identity";
  displayName = "Microsoft Identity";
  activate(solutionSettings: AzureSolutionSettings): boolean {
    return solutionSettings.hostType === HostTypeOptionAzure.id;
  }

  async provision(ctx: PluginContext): Promise<Result<void, FxError>> {
    return ok(undefined);
  }

  async postProvision(ctx: PluginContext): Promise<Result<void, FxError>> {
    return ok(undefined);
  }

  public async updateArmTemplates(ctx: PluginContext): Promise<Result<any, FxError>> {
    const result: ArmTemplateResult = {
      Reference: {
        identityName: IdentityBicep.identityName,
        identityClientId: IdentityBicep.identityClientId,
        identityResourceId: IdentityBicep.identityResourceId,
        identityPrincipalId: IdentityBicep.identityPrincipalId,
      },
    };

    return ok(result);
  }

  public async generateArmTemplates(ctx: PluginContext): Promise<Result<any, FxError>> {
    const plugins = getActivatedV2ResourcePlugins(ctx.projectSettings!).map(
      (p) => new NamedArmResourcePluginAdaptor(p)
    );
    const pluginCtx = { plugins: plugins.map((obj) => obj.name) };
    const bicepTemplateDirectory = path.join(
      getTemplatesFolder(),
      "plugins",
      "resource",
      "identity",
      "bicep"
    );
    const provisionOrchestration = await generateBicepFromFile(
      path.join(bicepTemplateDirectory, Bicep.ProvisionFileName),
      pluginCtx
    );
    const provisionModules = await generateBicepFromFile(
      path.join(bicepTemplateDirectory, IdentityBicepFile.moduleTempalteFilename),
      pluginCtx
    );
    const result: ArmTemplateResult = {
      Provision: {
        Orchestration: provisionOrchestration,
        Modules: { identity: provisionModules },
      },
      Reference: {
        identityName: IdentityBicep.identityName,
        identityClientId: IdentityBicep.identityClientId,
        identityResourceId: IdentityBicep.identityResourceId,
        identityPrincipalId: IdentityBicep.identityPrincipalId,
      },
    };

    return ok(result);
  }

  public async executeUserTask(func: Func, context: PluginContext): Promise<Result<void, FxError>> {
    if (func.method === "migrateV1Project") {
      return ok(undefined); // Not need to do anything when migrate V1 project
    }
    return ok(undefined);
  }
}

export default new IdentityPlugin();
