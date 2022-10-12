import {
  err,
  FxError,
  Inputs,
  PluginContext,
  Result,
  SystemError,
  v2,
} from "@microsoft/teamsfx-api";
import { ArmTemplateResult, NamedArmResourcePlugin } from "../../../../common/armInterface";
import { SolutionError, SolutionSource } from "../constants";

export class NamedArmResourcePluginAdaptor implements NamedArmResourcePlugin {
  name: string;
  generateArmTemplates?: (ctx: PluginContext) => Promise<Result<ArmTemplateResult, FxError>>;
  updateArmTemplates?: (ctx: PluginContext) => Promise<Result<ArmTemplateResult, FxError>>;
  constructor(v2Plugin: v2.ResourcePlugin) {
    this.name = v2Plugin.name;
    if (v2Plugin.generateResourceTemplate) {
      const fn = v2Plugin.generateResourceTemplate.bind(v2Plugin);
      this.generateArmTemplates = this._generateArmTemplates(fn);
    }
    if (v2Plugin.updateResourceTemplate) {
      const fn = v2Plugin.updateResourceTemplate.bind(v2Plugin);
      this.updateArmTemplates = this._updateArmTemplates(fn);
    }
  }

  _generateArmTemplates(
    fn: NonNullable<v2.ResourcePlugin["generateResourceTemplate"]>
  ): (ctx: PluginContext) => Promise<Result<ArmTemplateResult, FxError>> {
    return async (ctx: PluginContext): Promise<Result<ArmTemplateResult, FxError>> => {
      if (
        !ctx.ui ||
        !ctx.logProvider ||
        !ctx.telemetryReporter ||
        !ctx.cryptoProvider ||
        !ctx.projectSettings ||
        !ctx.answers
      ) {
        return err(
          new SystemError(SolutionSource, SolutionError.InternelError, "invalid plugin context")
        );
      }
      const v2ctx: v2.Context = {
        userInteraction: ctx.ui,
        logProvider: ctx.logProvider,
        telemetryReporter: ctx.telemetryReporter,
        cryptoProvider: ctx.cryptoProvider,
        projectSetting: ctx.projectSettings,
      };
      ctx.answers.projectPath = ctx.root;
      const result = await fn(v2ctx, ctx.answers as Inputs & { existingResources: string[] });
      return result.map((r) => r.template);
    };
  }

  _updateArmTemplates(
    fn: NonNullable<v2.ResourcePlugin["updateResourceTemplate"]>
  ): (ctx: PluginContext) => Promise<Result<ArmTemplateResult, FxError>> {
    return async (ctx: PluginContext): Promise<Result<ArmTemplateResult, FxError>> => {
      if (
        !ctx.ui ||
        !ctx.logProvider ||
        !ctx.telemetryReporter ||
        !ctx.cryptoProvider ||
        !ctx.projectSettings ||
        !ctx.answers
      ) {
        return err(
          new SystemError(SolutionSource, SolutionError.InternelError, "invalid plugin context")
        );
      }
      const v2ctx: v2.Context = {
        userInteraction: ctx.ui,
        logProvider: ctx.logProvider,
        telemetryReporter: ctx.telemetryReporter,
        cryptoProvider: ctx.cryptoProvider,
        projectSetting: ctx.projectSettings,
      };
      ctx.answers.projectPath = ctx.root;
      const result = await fn(v2ctx, ctx.answers as Inputs & { existingResources: string[] });
      return result.map((r) => r.template);
    };
  }
}
