// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { ContextV3, err, Inputs, Platform, SystemError, UserError } from "@microsoft/teamsfx-api";
import { FxCICDPluginResultFactory as ResultFactory, FxResult } from "./result";
import { CICDProviderFactory } from "./provider/factory";
import { ProviderKind } from "./provider/enums";
import { providerIdToLabel, questionNames, templateIdToLabel } from "./questions";
import { ErrorType, InternalError, NoProjectOpenedError, PluginError } from "./errors";
import { Logger } from "./logger";
import { getDefaultString, getLocalizedString } from "../../../common/localizeUtils";
import { VSCodeExtensionCommand } from "../../../common/constants";
import { telemetryHelper } from "./utils/telemetry-helper";
import { LifecycleFuncNames } from "./constants";

export class CICDImpl {
  public commonProperties: { [key: string]: string } = {};
  public async addCICDWorkflows(
    context: ContextV3,
    inputs: Inputs,
    envName: string
  ): Promise<FxResult> {
    const envInfo = context.envInfo;
    telemetryHelper.sendStartEvent(
      context,
      envInfo,
      LifecycleFuncNames.ADD_CICD_WORKFLOWS,
      this.commonProperties
    );
    try {
      // 1. Key inputs (envName, provider, template) x (hostingType, ).
      if (!inputs.projectPath) {
        throw new NoProjectOpenedError();
      }

      const projectPath = inputs.projectPath;
      const providerName = inputs[questionNames.Provider];
      const templateNames = inputs[questionNames.Template] as string[];

      if (!envName || !providerName || templateNames.length === 0) {
        throw new InternalError([
          getDefaultString("error.cicd.PreconditionNotMet"),
          getLocalizedString("error.cicd.PreconditionNotMet"),
        ]);
      }

      this.commonProperties = {
        env: envName,
        provider: providerName,
        template: templateNames.join(","),
      };

      // 2. Call factory to get provider instance.
      const providerInstance = CICDProviderFactory.create(providerName as ProviderKind);

      // 3. Call instance.scaffold(template, replacements: any).
      //  3.1 Call the initial scaffold.
      const progressBar = context.userInteraction.createProgressBar(
        getLocalizedString("plugins.cicd.ProgressBar.scaffold.title"),
        templateNames.length
      );

      const created: string[] = [];
      const skipped: string[] = [];

      await progressBar.start(
        getLocalizedString("plugins.cicd.ProgressBar.scaffold.detail", templateNames[0])
      );
      let scaffolded = await providerInstance.scaffold(
        projectPath,
        templateNames[0],
        envName,
        context
      );
      if (scaffolded.isOk() && !scaffolded.value) {
        created.push(templateIdToLabel(templateNames[0]));
      } else {
        skipped.push(templateIdToLabel(templateNames[0]));
      }

      //  3.2 Call the next scaffold.
      for (const templateName of templateNames.slice(1)) {
        await progressBar.next(
          getLocalizedString("plugins.cicd.ProgressBar.scaffold.detail", templateName)
        );
        scaffolded = await providerInstance.scaffold(projectPath, templateName, envName, context);
        if (scaffolded.isOk() && !scaffolded.value) {
          created.push(templateIdToLabel(templateName));
        } else {
          skipped.push(templateIdToLabel(templateName));
        }
      }

      await progressBar.end(true);

      // 4. Send notification messages.
      const messages = [];
      if (created.length > 0) {
        messages.push(
          getLocalizedString(
            "plugins.cicd.result.scaffold.created",
            created.join(", "),
            providerIdToLabel(providerName),
            envName
          )
        );
      }
      if (skipped.length > 0) {
        messages.push(
          getLocalizedString(
            "plugins.cicd.result.scaffold.skipped",
            skipped.join(", "),
            providerIdToLabel(providerName),
            envName
          )
        );
      }

      const message = messages.join(" ");
      context.userInteraction.showMessage("info", message, false);
      Logger.info(message);

      const res = ResultFactory.Success();
      telemetryHelper.sendResultEvent(
        context,
        envInfo,
        LifecycleFuncNames.ADD_CICD_WORKFLOWS,
        res,
        this.commonProperties
      );

      return res;
    } catch (e) {
      if (e instanceof UserError || e instanceof SystemError) {
        const res = err(e);

        telemetryHelper.sendResultEvent(
          context,
          envInfo,
          LifecycleFuncNames.ADD_CICD_WORKFLOWS,
          res,
          this.commonProperties
        );
        return res;
      }

      if (e instanceof PluginError) {
        const result =
          e.errorType === ErrorType.System
            ? ResultFactory.SystemError(
                e.name,
                [e.genDefaultMessage(), e.genMessage()],
                e.innerError
              )
            : ResultFactory.UserError(
                e.name,
                [e.genDefaultMessage(), e.genMessage()],
                e.showHelpLink,
                e.innerError
              );

        telemetryHelper.sendResultEvent(
          context,
          envInfo,
          LifecycleFuncNames.ADD_CICD_WORKFLOWS,
          result,
          this.commonProperties
        );
        return result;
      } else {
        // Unrecognized Exception.
        const UnhandledErrorCode = "UnhandledError";

        telemetryHelper.sendResultEvent(
          context,
          envInfo,
          LifecycleFuncNames.ADD_CICD_WORKFLOWS,
          ResultFactory.SystemError(
            UnhandledErrorCode,
            [`Got an unhandled error: ${e.message}`, `Got an unhandled error: ${e.message}`],
            e.innerError
          ),
          this.commonProperties
        );
        return ResultFactory.SystemError(UnhandledErrorCode, e.message, e);
      }
    }
  }
}
