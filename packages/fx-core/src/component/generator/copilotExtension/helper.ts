// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  Context,
  DefaultApiSpecFolderName,
  err,
  FxError,
  ok,
  Result,
  UserError,
} from "@microsoft/teamsfx-api";
import { copilotGptManifestUtils } from "../../driver/teamsApp/utils/CopilotGptManifestUtils";
import { pluginManifestUtils } from "../../driver/teamsApp/utils/PluginManifestUtils";
import { AppStudioError } from "../../driver/teamsApp/errors";
import { AppStudioResultFactory } from "../../driver/teamsApp/results";
import path from "path";
import fs from "fs-extra";
import { normalizePath } from "../../driver/teamsApp/utils/utils";

export async function addExistingPlugin(
  declarativeCopilotManifestPath: string,
  fromPluginManifestPath: string,
  fromApiSpecPath: string,
  actionId: string,
  context: Context
): Promise<Result<undefined, FxError>> {
  const declarativeCopilotManifestRes = await copilotGptManifestUtils.readCopilotGptManifestFile(
    declarativeCopilotManifestPath
  );
  if (declarativeCopilotManifestRes.isErr()) {
    return err(declarativeCopilotManifestRes.error);
  }

  const pluginManifestRes = await pluginManifestUtils.readPluginManifestFile(
    fromPluginManifestPath
  );
  if (pluginManifestRes.isErr()) {
    return err(pluginManifestRes.error);
  }
  const pluginManifest = pluginManifestRes.value;

  // prerequiste check
  const runtimes = pluginManifest.runtimes;
  if (!runtimes) {
    return err(
      AppStudioResultFactory.UserError(
        AppStudioError.TeamsAppRequiredPropertyMissingError.name,
        AppStudioError.TeamsAppRequiredPropertyMissingError.message(
          "runtimes",
          fromPluginManifestPath
        )
      )
    );
  }

  const expectedApiSpecRelativePath = new Set<string>();
  for (const runtime of runtimes) {
    if (runtime.type === "OpenApi" && runtime.spec?.url) {
      expectedApiSpecRelativePath.add(runtime.spec.url);
    }
  }

  if (expectedApiSpecRelativePath.size === 0) {
    return err(new UserError("", "", "", ""));
  }

  if (expectedApiSpecRelativePath.size > 1) {
    return err(new UserError("", "", "", ""));
  }

  const outputFolder = path.dirname(declarativeCopilotManifestPath);

  // Copy OpenAPI spec
  let needUpdatePluginManifest = false;
  const destinationApiSpecRelativePath = Array.from(expectedApiSpecRelativePath)[0];

  const originalDestApiSPecRelativePath = path.resolve(
    outputFolder,
    destinationApiSpecRelativePath
  );
  let destinationApiSpecPath = originalDestApiSPecRelativePath;
  if (
    (await fs.pathExists(originalDestApiSPecRelativePath)) &&
    !path.isAbsolute(originalDestApiSPecRelativePath)
  ) {
    context.logProvider.warning(`${originalDestApiSPecRelativePath} exists.`);
  } else {
    destinationApiSpecPath = await pluginManifestUtils.getDefaultNextAvailableApiSpecPath(
      fromApiSpecPath,
      path.join(outputFolder, DefaultApiSpecFolderName)
    );
    needUpdatePluginManifest = true;
  }
  await fs.ensureFile(destinationApiSpecPath);
  await fs.copyFile(fromApiSpecPath, destinationApiSpecPath);

  // Save plugin manifest
  if (needUpdatePluginManifest) {
    const runtimeSpecUrl = normalizePath(path.relative(outputFolder, destinationApiSpecPath), true);
    for (const runtime of runtimes) {
      if (runtime.type === "OpenApi" && runtime.spec?.url) {
        runtime.spec.url = runtimeSpecUrl;
      }
    }
  }

  const destinationPluginManifestPath =
    await copilotGptManifestUtils.getDefaultNextAvailablePluginManifestPath(outputFolder);
  await fs.ensureFile(destinationPluginManifestPath);
  const pluginManifestContent = JSON.stringify(pluginManifest, undefined, 4);
  await fs.writeFile(destinationPluginManifestPath, pluginManifestContent);

  // Update declarative copilot plugin manifest
  const addActionRes = await copilotGptManifestUtils.addAction(
    declarativeCopilotManifestPath,
    actionId,
    normalizePath(path.relative(outputFolder, destinationPluginManifestPath), true)
  );
  if (addActionRes.isErr()) {
    return err(addActionRes.error);
  }

  return ok(undefined);
}
