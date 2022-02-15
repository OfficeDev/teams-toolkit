// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, Result, ok } from "@microsoft/teamsfx-api";
import axios, { AxiosResponse } from "axios";
import * as fs from "fs-extra";
import { sendRequestWithTimeout } from "../../../../common/template-utils/templatesUtils";
import { InternalError } from "../errors";
import { TemplateKind } from "./enums";
import { Logger } from "../logger";

export class CICDProvider {
  public targetPath = "";
  public async scaffold(
    projectPath: string,
    templateNames: string[],
    replacements: any
  ): Promise<Result<boolean, FxError>> {
    if (!(await fs.pathExists(projectPath))) {
      throw new InternalError(`${projectPath} not found.`);
    }

    // if (!Object.values(TemplateKind).includes(templateName as TemplateKind)) {
    //     throw new InternalError(`${templateName} as template kind was not recognized.`);
    // }
    return ok(true);
  }

  public async fetchRemoteOrFallbackLocal(url: string, localPath: string): Promise<string> {
    try {
      const res: AxiosResponse<any> = await sendRequestWithTimeout(
        async (cancelToken) => {
          return await axios.get(url, {
            responseType: "text",
            cancelToken: cancelToken,
          });
        },
        30000,
        1
      );
      if (!res.data) return res.data as string;
    } catch (e) {
      Logger.debug(`Fail to get ${url}, ${e.message}`);
    }

    if (!(await fs.pathExists(localPath))) {
      throw new InternalError(`local path: ${localPath} not found.`);
    }

    try {
      return (await fs.readFile(localPath)).toString();
    } catch (e) {
      throw new InternalError(`Fail to read file: ${localPath}`, e as Error);
    }
  }
}
