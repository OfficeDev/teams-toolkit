// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as fs from "fs-extra";
import { FxError, TeamsAppManifest, Result, err, ok } from "@microsoft/teamsfx-api";
import { getAppDirectory } from "../../../common";
import { AppStudioError } from "./errors";
import { AppStudioResultFactory } from "./results";
import { MANIFEST_LOCAL, MANIFEST_TEMPLATE } from "./constants";

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
