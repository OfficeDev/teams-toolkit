// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { err, FxError, ok, Result } from "@microsoft/teamsfx-api";
import { FileNotFoundError, JSONSyntaxError, ReadFileError } from "../error/common";
import fs from "fs-extra";

class JSONUtils {
  parseJSON(content: string): Result<any, FxError> {
    try {
      const obj = JSON.parse(content);
      return ok(obj);
    } catch (e: any) {
      return err(new JSONSyntaxError(content, e));
    }
  }
  async readJSONFile(filePath: string): Promise<Result<any, FxError>> {
    try {
      const res = await fs.readJSON(filePath);
      return ok(res);
    } catch (e: any) {
      if (e.name === "SyntaxError") {
        const error = new JSONSyntaxError(filePath, e);
        return err(error);
      } else if (e.message?.includes("no such file or directory")) {
        return err(new FileNotFoundError("common", filePath));
      }
      return err(new ReadFileError(e, "common"));
    }
  }

  readJSONFileSync(filePath: string): Result<any, FxError> {
    try {
      const res = fs.readJSONSync(filePath);
      return ok(res);
    } catch (e: any) {
      if (e.name === "SyntaxError") {
        const error = new JSONSyntaxError(filePath, e);
        return err(error);
      } else if (e.message?.includes("no such file or directory")) {
        return err(new FileNotFoundError("common", filePath));
      }
      return err(new ReadFileError(e, "common"));
    }
  }
}

export const jsonUtils = new JSONUtils();
