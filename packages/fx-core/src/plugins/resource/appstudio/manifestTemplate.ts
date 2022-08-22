// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { getAppDirectory } from "../../../common/tools";
import { MANIFEST_TEMPLATE_CONSOLIDATE } from "./constants";

export async function getManifestTemplatePath(projectRoot: string): Promise<string> {
  const appDir = await getAppDirectory(projectRoot);
  return `${appDir}/${MANIFEST_TEMPLATE_CONSOLIDATE}`;
}
