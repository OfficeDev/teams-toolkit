import { err, FxError, ok, Result } from "@microsoft/teamsfx-api";
import { FileNotFoundError, JSONSyntaxError, ReadFileError, UnhandledError } from "../error/common";
import fs from "fs-extra";

export class JSONUtils {
  parseJSON(content: string): Result<any, FxError> {
    try {
      const obj = JSON.parse(content);
      return ok(obj);
    } catch (e: any) {
      if (e.name === "SyntaxError") {
        const error = new JSONSyntaxError(content, e);
        return err(error);
      }
      return err(new UnhandledError(e, "common"));
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
}

export const jsonUtils = new JSONUtils();
