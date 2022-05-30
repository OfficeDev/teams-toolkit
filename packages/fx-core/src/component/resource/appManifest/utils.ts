// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { FxError, ok, Result, TeamsAppManifest } from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import * as path from "path";
import "reflect-metadata";

export async function readAppManifest(
  projectPath: string
): Promise<Result<TeamsAppManifest, FxError>> {
  const filePath = path.join(projectPath, "templates", "appPackage", "manifest.template.json");
  const manifest = (await fs.readJson(filePath)) as TeamsAppManifest;
  return ok(manifest);
}

export async function writeAppManifest(
  appManifest: TeamsAppManifest,
  projectPath: string
): Promise<Result<undefined, FxError>> {
  const filePath = path.join(projectPath, "templates", "appPackage", "manifest.template.json");
  await fs.writeFile(filePath, JSON.stringify(appManifest, undefined, 4));
  return ok(undefined);
}
