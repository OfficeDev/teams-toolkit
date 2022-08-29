import * as path from "path";
import {
  PluginContext,
  Plugin,
  ok,
  AzureSolutionSettings,
  Result,
  FxError,
  SystemError,
  UserError,
  err,
} from "@microsoft/teamsfx-api";
import { Constants, IdentityBicep, IdentityBicepFile, Telemetry } from "./constants";
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
import { TelemetryUtils } from "./utils/telemetryUtil";
@Service(ResourcePlugins.IdentityPlugin)
export class IdentityPlugin implements Plugin {
  name = "fx-resource-identity";
  displayName = "Microsoft Identity";
  activate(solutionSettings: AzureSolutionSettings): boolean {
    return solutionSettings.hostType === HostTypeOptionAzure.id;
  }

  async provision(ctx: PluginContext): Promise<Result<any, FxError>> {
    return ok(undefined);
  }

  public async updateArmTemplates(ctx: PluginContext): Promise<Result<any, FxError>> {
    TelemetryUtils.init(ctx.telemetryReporter);
    TelemetryUtils.sendEvent(Telemetry.stage.updateArmTemplates + Telemetry.startSuffix);
    const result: ArmTemplateResult = {
      Reference: {
        identityName: IdentityBicep.identityName,
        identityClientId: IdentityBicep.identityClientId,
        identityResourceId: IdentityBicep.identityResourceId,
        identityPrincipalId: IdentityBicep.identityPrincipalId,
      },
    };
    TelemetryUtils.sendEvent(Telemetry.stage.updateArmTemplates, true);
    return ok(result);
  }

  public async generateArmTemplates(ctx: PluginContext): Promise<Result<any, FxError>> {
    try {
      TelemetryUtils.init(ctx.telemetryReporter);
      TelemetryUtils.sendEvent(Telemetry.stage.generateArmTemplates + Telemetry.startSuffix);

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
      TelemetryUtils.sendEvent(Telemetry.stage.generateArmTemplates, true);
      return ok(result);
    } catch (e) {
      if (!(e instanceof Error || e instanceof SystemError || e instanceof UserError)) {
        e = new Error(e.toString());
      }
      if (!(e instanceof SystemError) && !(e instanceof UserError)) {
        ctx.logProvider?.error(e.message);
      }
      let res: Result<any, FxError>;
      if (e instanceof SystemError || e instanceof UserError) {
        res = err(e);
      } else {
        res = err(
          new SystemError({ error: e, source: Constants.pluginNameShort, name: "UnhandledError" })
        );
      }
      const errorCode = res.error.source + "." + res.error.name;
      const errorType =
        res.error instanceof SystemError ? Telemetry.systemError : Telemetry.userError;
      TelemetryUtils.init(ctx.telemetryReporter);
      let errorMessage = res.error.message;
      if (res.error.innerError) {
        errorMessage += ` Detailed error: ${res.error.innerError.message}.`;
      }
      TelemetryUtils.sendErrorEvent(
        Telemetry.stage.generateArmTemplates,
        errorCode,
        errorType,
        errorMessage
      );
      return res;
    }
  }
}

export default new IdentityPlugin();
