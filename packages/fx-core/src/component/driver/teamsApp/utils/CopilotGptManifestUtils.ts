// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, Result, err, ok, CopilotGptManifestSchema } from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import { FileNotFoundError, JSONSyntaxError } from "../../../../error/common";
import stripBom from "strip-bom";

export class CopilotGptManifestUtils {
  public async readCopilotGptManifestFile(
    path: string
  ): Promise<Result<CopilotGptManifestSchema, FxError>> {
    if (!(await fs.pathExists(path))) {
      return err(new FileNotFoundError("CopilotGptManifestUtils", path));
    }
    // Be compatible with UTF8-BOM encoding
    // Avoid Unexpected token error at JSON.parse()
    let content = await fs.readFile(path, { encoding: "utf-8" });
    content = stripBom(content);

    try {
      const manifest = JSON.parse(content) as CopilotGptManifestSchema;
      return ok(manifest);
    } catch (e) {
      return err(new JSONSyntaxError(path, e, "CopilotGptManifestUtils"));
    }
  }

  public async writeCopilotGptManifestFile(
    manifest: CopilotGptManifestSchema,
    path: string
  ): Promise<Result<undefined, FxError>> {
    const content = JSON.stringify(manifest, undefined, 4);
    await fs.writeFile(path, content);
    return ok(undefined);
  }
}

export const copilotGptManifestUtils = new CopilotGptManifestUtils();
