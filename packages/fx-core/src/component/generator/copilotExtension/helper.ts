// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  Context,
  DefaultApiSpecFolderName,
  err,
  FxError,
  ok,
  PluginManifestSchema,
  Result,
  UserError,
} from "@microsoft/teamsfx-api";
import { copilotGptManifestUtils } from "../../driver/teamsApp/utils/CopilotGptManifestUtils";
import { pluginManifestUtils } from "../../driver/teamsApp/utils/PluginManifestUtils";
import path from "path";
import fs from "fs-extra";
import { normalizePath } from "../../driver/teamsApp/utils/utils";
import { getDefaultString, getLocalizedString } from "../../../common/localizeUtils";

export async function addExistingPlugin(
  declarativeCopilotManifestPath: string,
  fromPluginManifestPath: string,
  fromApiSpecPath: string,
  actionId: string,
  context: Context,
  source: string
): Promise<Result<undefined, FxError>> {
  const pluginManifestRes = await pluginManifestUtils.readPluginManifestFile(
    fromPluginManifestPath
  );
  if (pluginManifestRes.isErr()) {
    return err(pluginManifestRes.error);
  }
  const pluginManifest = pluginManifestRes.value;

  // prerequiste check
  const checkRes = validateSourcePluginManifest(pluginManifest, source);
  if (checkRes.isErr()) {
    return err(checkRes.error);
  }
  const runtimes = pluginManifest.runtimes!; // have validated that the value exists.
  const destinationApiSpecRelativePath = runtimes.find((runtime) => runtime.type === "OpenApi")!
    .spec.url as string; // have validated that the value exists.

  const outputFolder = path.dirname(declarativeCopilotManifestPath);

  // Copy OpenAPI spec
  const originalDestApiSPecRelativePath = path.resolve(
    outputFolder,
    destinationApiSpecRelativePath
  );
  let destinationApiSpecPath = originalDestApiSPecRelativePath;
  const needUpdatePluginManifest =
    (await fs.pathExists(originalDestApiSPecRelativePath)) ||
    path.relative(outputFolder, originalDestApiSPecRelativePath).startsWith("..");

  if (needUpdatePluginManifest) {
    destinationApiSpecPath = await pluginManifestUtils.getDefaultNextAvailableApiSpecPath(
      fromApiSpecPath,
      path.join(outputFolder, DefaultApiSpecFolderName)
    );
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

export function validateSourcePluginManifest(
  manifest: PluginManifestSchema,
  source: string
): Result<undefined, UserError> {
  if (!manifest.schema_version) {
    return err(
      new UserError(
        source,
        "MissingSchemaVersion",
        getDefaultString(
          "core.createProjectQuestion.addPlugin.MissingRequiredProperty",
          "schema_version"
        ),
        getLocalizedString(
          "core.createProjectQuestion.addPlugin.MissingRequiredProperty",
          "schema_version"
        )
      )
    );
  }

  if (!manifest.runtimes) {
    return err(
      new UserError(
        source,
        "MissingRuntimes",
        getDefaultString(
          "core.createProjectQuestion.addPlugin.MissingRequiredProperty",
          "runtimes"
        ),
        getLocalizedString(
          "core.createProjectQuestion.addPlugin.MissingRequiredProperty",
          "runtimes"
        )
      )
    );
  }

  const apiSpecPaths = new Set<string>();
  for (const runtime of manifest.runtimes) {
    if (runtime.type === "OpenApi" && runtime.spec?.url) {
      apiSpecPaths.add(runtime.spec.url);
    }
  }

  if (apiSpecPaths.size === 0) {
    return err(
      new UserError(
        source,
        "MissingApiSpec",
        getDefaultString(
          "core.createProjectQuestion.addPlugin.pluginManifestMissingApiSpec",
          "OpenApi"
        ),
        getLocalizedString(
          "core.createProjectQuestion.addPlugin.pluginManifestMissingApiSpec",
          "OpenApi"
        )
      )
    );
  }

  if (apiSpecPaths.size > 1) {
    return err(
      new UserError(
        source,
        "MultipleApiSpecInPluginManifest",
        getDefaultString(
          "core.createProjectQuestion.addPlugin.pluginManifestMultipleApiSpec",
          Array.from(apiSpecPaths).join(", ")
        ),
        getLocalizedString(
          "core.createProjectQuestion.addPlugin.pluginManifestMultipleApiSpec",
          Array.from(apiSpecPaths).join(", ")
        )
      )
    );
  }

  return ok(undefined);
}
