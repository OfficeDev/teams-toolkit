// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as fs from "fs-extra";
import { FxError, TeamsAppManifest, Result, err, ok } from "@microsoft/teamsfx-api";
import { getAppDirectory } from "../../../common";
import { AppStudioError } from "./errors";
import { AppStudioResultFactory } from "./results";
import { STATIC_TABS_MAX_ITEMS, MANIFEST_LOCAL, MANIFEST_TEMPLATE } from "./constants";

export async function getManifestTemplatePath(
  projectRoot: string,
  isLocalDebug: boolean
): Promise<string> {
  const appDir = await getAppDirectory(projectRoot);
  return isLocalDebug ? `${appDir}/${MANIFEST_LOCAL}` : `${appDir}/${MANIFEST_TEMPLATE}`;
}

export async function loadManifest(
  projectRoot: string,
  isLocalDebug: boolean
): Promise<Result<TeamsAppManifest, FxError>> {
  const manifestFilePath = await getManifestTemplatePath(projectRoot, isLocalDebug);
  if (!(await fs.pathExists(manifestFilePath))) {
    return err(
      AppStudioResultFactory.UserError(
        AppStudioError.FileNotFoundError.name,
        AppStudioError.FileNotFoundError.message(manifestFilePath)
      )
    );
  }

  try {
    const manifest = await fs.readJson(manifestFilePath);
    return ok(manifest);
  } catch (e: any) {
    if (e.stack && e.stack.startsWith("SyntaxError")) {
      return err(
        AppStudioResultFactory.UserError(
          AppStudioError.ManifestLoadFailedError.name,
          AppStudioError.ManifestLoadFailedError.message(
            `Failed to load manifest file from ${manifestFilePath}, due to ${e.message}`
          )
        )
      );
    }
    return err(
      AppStudioResultFactory.SystemError(
        AppStudioError.ManifestLoadFailedError.name,
        AppStudioError.ManifestLoadFailedError.message(
          `Failed to load manifest file from ${manifestFilePath}, due to ${e.message}`
        )
      )
    );
  }
}

export async function saveManifest(
  projectRoot: string,
  manifest: TeamsAppManifest,
  isLocalDebug: boolean
): Promise<Result<any, FxError>> {
  const manifestFilePath = await getManifestTemplatePath(projectRoot, isLocalDebug);
  await fs.writeFile(manifestFilePath, JSON.stringify(manifest, null, 4));
  return ok(manifestFilePath);
}

export async function capabilityExceedLimit(
  projectRoot: string,
  capability: "staticTab" | "configurableTab" | "Bot" | "MessageExtension"
): Promise<Result<boolean, FxError>> {
  const localManifest = await loadManifest(projectRoot, true);
  if (localManifest.isErr()) {
    return err(localManifest.error);
  }

  const remoteManifest = await loadManifest(projectRoot, false);
  if (remoteManifest.isErr()) {
    return err(remoteManifest.error);
  }

  let localExceed,
    remoteExceed = false;
  switch (capability) {
    case "staticTab":
      localExceed =
        localManifest.value.staticTabs !== undefined &&
        localManifest.value.staticTabs!.length >= STATIC_TABS_MAX_ITEMS;
      remoteExceed =
        remoteManifest.value.staticTabs !== undefined &&
        remoteManifest.value.staticTabs!.length >= STATIC_TABS_MAX_ITEMS;
      return ok(localExceed || remoteExceed);
    case "configurableTab":
      localExceed =
        localManifest.value.configurableTabs !== undefined &&
        localManifest.value.configurableTabs!.length >= 1;
      remoteExceed =
        remoteManifest.value.configurableTabs !== undefined &&
        remoteManifest.value.configurableTabs!.length >= 1;
      return ok(localExceed || remoteExceed);
    case "Bot":
      localExceed = localManifest.value.bots !== undefined && localManifest.value.bots!.length >= 1;
      remoteExceed =
        remoteManifest.value.bots !== undefined && remoteManifest.value.bots!.length >= 1;
      return ok(localExceed || remoteExceed);
    case "MessageExtension":
      localExceed =
        localManifest.value.composeExtensions !== undefined &&
        localManifest.value.composeExtensions!.length >= 1;
      remoteExceed =
        remoteManifest.value.composeExtensions !== undefined &&
        remoteManifest.value.composeExtensions!.length >= 1;
      return ok(localExceed || remoteExceed);
    default:
      return err(
        AppStudioResultFactory.SystemError(
          AppStudioError.InvalidCapabilityError.name,
          AppStudioError.InvalidCapabilityError.message(capability)
        )
      );
  }
}
