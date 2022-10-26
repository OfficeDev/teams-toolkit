import { FxError, Result, ok, err } from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import { load } from "js-yaml";
import { InvalidLifecycleError, YamlParsingError } from "./error";
import { IYamlParser, ProjectModel, RawProjectModel, LifecycleNames } from "./interface";
import { Lifecycle } from "./lifecycle";

function parseLifecycles(obj: Record<string, unknown>): Result<RawProjectModel, FxError> {
  const result: RawProjectModel = {};
  for (const name of LifecycleNames) {
    if (name in obj) {
      const value = obj[name];
      if (!Array.isArray(value)) {
        return err(new InvalidLifecycleError(name));
      }
      for (const elem of value) {
        if (!("uses" in elem && "with" in elem)) {
          return err(new InvalidLifecycleError(name));
        }
      }
      result[name] = value;
    }
  }

  return ok(result);
}

export class YamlParser implements IYamlParser {
  async parse(path: string): Promise<Result<ProjectModel, FxError>> {
    const raw = await this.parseRaw(path);
    if (raw.isErr()) {
      return err(raw.error);
    }
    const result: ProjectModel = {};
    for (const name of LifecycleNames) {
      if (name in raw.value) {
        const definitions = raw.value[name];
        if (definitions) {
          result[name] = new Lifecycle(name, definitions);
        }
      }
    }
    return ok(result);
  }

  private async parseRaw(path: string): Promise<Result<RawProjectModel, FxError>> {
    try {
      const str = await fs.readFile(path, "utf8");
      const content = load(str);
      // note: typeof null === "object" typeof undefined === "undefined" in js
      if (typeof content !== "object" || Array.isArray(content) || content === null) {
        return err(new YamlParsingError(path, new Error(`Invalid yaml format: ${str}`)));
      }
      const value = content as unknown as Record<string, unknown>;
      return parseLifecycles(value);
    } catch (error) {
      if (error instanceof Error) {
        return err(new YamlParsingError(path, error));
      } else {
        return err(
          new YamlParsingError(path, new Error(`Unknown error: ${JSON.stringify(error)}`))
        );
      }
    }
  }
}
