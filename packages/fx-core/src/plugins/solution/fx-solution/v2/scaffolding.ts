import {
  v2,
  Inputs,
  FxError,
  Result,
  ok,
  err,
  Void,
  AzureSolutionSettings,
  returnSystemError,
} from "@microsoft/teamsfx-api";
import { getStrings, isMultiEnvEnabled } from "../../../../common/tools";
import {
  AzureResourceFunction,
  AzureSolutionQuestionNames,
  BotOptionItem,
  MessageExtensionItem,
  TabOptionItem,
} from "../question";
import { executeConcurrently, NamedThunk } from "./executor";
import {
  blockV1Project,
  combineRecords,
  getAzureSolutionSettings,
  getSelectedPlugins,
  fillInSolutionSettings,
  isAzureProject,
} from "./utils";
import path from "path";
import fs from "fs-extra";
import {
  DEFAULT_PERMISSION_REQUEST,
  getTemplatesFolder,
  SolutionError,
  SolutionTelemetryComponentName,
  SolutionTelemetryEvent,
  SolutionTelemetryProperty,
  SolutionTelemetrySuccess,
} from "../../../..";
import { LocalSettingsProvider } from "../../../../common/localSettingsProvider";
import { Json } from "@microsoft/teamsfx-api";

export async function scaffoldSourceCode(
  ctx: v2.Context,
  inputs: Inputs
): Promise<Result<Void, FxError>> {
  const blockResult = blockV1Project(ctx.projectSetting.solutionSettings);
  if (blockResult.isErr()) {
    return err(blockResult.error);
  }
  if (inputs.projectPath === undefined) {
    return err(
      returnSystemError(
        new Error("projectPath is undefined"),
        "Solution",
        SolutionError.InternelError
      )
    );
  }
  const lang = inputs[AzureSolutionQuestionNames.ProgrammingLanguage] as string;
  if (lang) {
    ctx.projectSetting.programmingLanguage = lang;
  }
  const solutionSettings: AzureSolutionSettings = getAzureSolutionSettings(ctx);
  const fillinRes = fillInSolutionSettings(solutionSettings, inputs);
  if (fillinRes.isErr()) return err(fillinRes.error);
  const plugins = getSelectedPlugins(solutionSettings);

  const thunks: NamedThunk<Void>[] = plugins
    .filter((plugin) => !!plugin.scaffoldSourceCode)
    .map((plugin) => {
      return {
        pluginName: `${plugin.name}`,
        taskName: "scaffoldSourceCode",
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        thunk: () => plugin.scaffoldSourceCode!(ctx, inputs),
      };
    });

  const result = await executeConcurrently(thunks, ctx.logProvider);
  if (result.kind === "success") {
    const capabilities = solutionSettings.capabilities;
    const azureResources = solutionSettings.azureResources;

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    await scaffoldReadme(capabilities, azureResources, inputs.projectPath!);

    ctx.userInteraction.showMessage(
      "info",
      `Success: ${getStrings().solution.ScaffoldSuccessNotice}`,
      false
    );

    if (isAzureProject(solutionSettings)) {
      await fs.writeJSON(`${inputs.projectPath}/permissions.json`, DEFAULT_PERMISSION_REQUEST, {
        spaces: 4,
      });
      ctx.telemetryReporter?.sendTelemetryEvent(SolutionTelemetryEvent.Create, {
        [SolutionTelemetryProperty.Component]: SolutionTelemetryComponentName,
        [SolutionTelemetryProperty.Success]: SolutionTelemetrySuccess.Yes,
        [SolutionTelemetryProperty.Resources]: solutionSettings.azureResources.join(";"),
        [SolutionTelemetryProperty.Capabilities]: solutionSettings.capabilities.join(";"),
        [SolutionTelemetryProperty.ProgrammingLanguage]:
          ctx.projectSetting?.programmingLanguage ?? "",
      });
    }
    return ok(Void);
  } else {
    return err(result.error);
  }
}

export async function scaffoldByPlugins(
  ctx: v2.Context,
  inputs: Inputs,
  localSettings: Json,
  plugins: v2.ResourcePlugin[]
): Promise<Result<Void, FxError>> {
  const blockResult = blockV1Project(ctx.projectSetting.solutionSettings);
  if (blockResult.isErr()) {
    return err(blockResult.error);
  }
  const thunks: NamedThunk<Void>[] = plugins
    .filter((plugin) => !!plugin.scaffoldSourceCode)
    .map((plugin) => {
      return {
        pluginName: `${plugin.name}`,
        taskName: "scaffoldSourceCode",
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        thunk: () => plugin.scaffoldSourceCode!(ctx, inputs),
      };
    });

  const result = await executeConcurrently(thunks, ctx.logProvider);
  const solutionSettings = getAzureSolutionSettings(ctx);
  if (result.kind === "success") {
    const capabilities = solutionSettings.capabilities;
    const azureResources = solutionSettings.azureResources;

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    await scaffoldReadme(capabilities, azureResources, inputs.projectPath!);

    ctx.userInteraction.showMessage(
      "info",
      `Success: ${getStrings().solution.ScaffoldSuccessNotice}`,
      false
    );
    return ok(Void);
  } else {
    return err(result.error);
  }
}

export async function scaffoldReadme(
  capabilities: string[],
  azureResources: string[],
  projectPath: string,
  migrateFromV1?: boolean
): Promise<void> {
  capabilities = capabilities || [];
  azureResources = azureResources || [];
  const hasBot = capabilities.includes(BotOptionItem.id);
  const hasMsgExt = capabilities.includes(MessageExtensionItem.id);
  const hasTab = capabilities.includes(TabOptionItem.id);
  if (hasTab && (hasBot || hasMsgExt)) {
    const readme = path.join(getTemplatesFolder(), "plugins", "solution", "README.md");
    if (await fs.pathExists(readme)) {
      await fs.copy(readme, `${projectPath}/README.md`);
    }
  }

  if (migrateFromV1) {
    const readme = path.join(getTemplatesFolder(), "plugins", "solution", "v1", "README.md");
    if (await fs.pathExists(readme)) {
      await fs.copy(readme, `${projectPath}/README.md`);
    }
  }
}
