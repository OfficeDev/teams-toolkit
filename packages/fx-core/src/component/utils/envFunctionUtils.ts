// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { err, FxError, ok, Result, UserError, UserErrorOptions } from "@microsoft/teamsfx-api";
import path from "path";
import fs from "fs-extra";
import stripBom from "strip-bom";
import { FileNotFoundError } from "../../error";
import { expandEnvironmentVariable, getAbsolutePath } from "./common";
import { WrapDriverContext } from "../driver/util/wrapUtil";

const source = "ResolveManifestFunction";
const telemetryEvent = "manifest-with-function";

enum TelemetryPropertyKey {
  manifestType = "manifest-type",
  functionCount = "function-count",
}

export enum ManifestType {
  TeamsManifest = "teams-manifest",
  PluginManifest = "plugin-manifest",
  DeclarativeCopilotManifest = "declarative-copilot-manifest",
  ApiSpec = "api-spec",
}

export async function expandVariableWithFunction(
  content: string,
  ctx: WrapDriverContext | undefined,
  envs: { [key in string]: string } | undefined,
  isJson: boolean,
  manifestType: ManifestType
): Promise<Result<string, FxError>> {
  const regex = /\$\[ *[a-zA-Z][a-zA-Z]*\([^\]]*\) *\]/g;
  const matches = content.match(regex);

  if (!matches) {
    return ok(content); // no function
  }
  let count = 0;
  for (const placeholder of matches) {
    const processedRes = await processFunction(placeholder.slice(2, -1).trim(), ctx, envs);
    if (processedRes.isErr()) {
      return err(processedRes.error);
    }
    let value = processedRes.value;
    if (isJson && value) {
      value = JSON.stringify(value).slice(1, -1);
    }
    if (value) {
      count += 1;
      content = content.replace(placeholder, value);
    }
  }

  if (count > 0) {
    ctx?.telemetryReporter.sendTelemetryEvent(telemetryEvent, {
      [TelemetryPropertyKey.manifestType]: manifestType.toString(),
      [TelemetryPropertyKey.functionCount]: count.toString(),
    });
  }
  return ok(content);
}

async function processFunction(
  content: string,
  ctx: WrapDriverContext | undefined,
  envs: { [key in string]: string } | undefined
): Promise<Result<string, FxError>> {
  const firstTrimmedContent = content.trim();
  if (!firstTrimmedContent.startsWith("file(") || !firstTrimmedContent.endsWith(")")) {
    return err(new InvalidFunctionError());
  }

  // file()
  const trimmedParameter = content.slice(5, -1).trim();
  if (trimmedParameter[0] === "'" && trimmedParameter[trimmedParameter.length - 1] === "'") {
    // static string as function parameter
    const res = await readFileContent(
      trimmedParameter.substring(1, trimmedParameter.length - 1),
      ctx,
      envs
    );
    return res;
  } else if (trimmedParameter.startsWith("${{") && trimmedParameter.endsWith("}}")) {
    // env variable inside
    const resolvedParameter = expandEnvironmentVariable(trimmedParameter, envs);

    const res = readFileContent(resolvedParameter, ctx, envs);
    return res;
  } else if (trimmedParameter.startsWith("file(") && trimmedParameter.endsWith(")")) {
    // nested function inside
    const processsedRes = await processFunction(trimmedParameter, ctx, envs);

    if (processsedRes.isErr()) {
      return err(processsedRes.error);
    }

    const readFileRes = await readFileContent(processsedRes.value, ctx, envs);
    return readFileRes;
  } else {
    // invalid content inside function
    return err(new InvalidFunctionParameter());
  }
}

async function readFileContent(
  filePath: string,
  ctx: WrapDriverContext | undefined,
  envs: { [key in string]: string } | undefined
): Promise<Result<string, FxError>> {
  const ext = path.extname(filePath);
  if (ext.toLowerCase() !== ".txt") {
    return err(new UnsupportedFileFormatError());
  }

  const absolutePath = !ctx?.projectPath ? filePath : getAbsolutePath(filePath, ctx.projectPath);
  if (await fs.pathExists(absolutePath)) {
    try {
      let fileContent = await fs.readFile(absolutePath, "utf8");
      fileContent = stripBom(fileContent);
      const processedFileContent = expandEnvironmentVariable(fileContent, envs);
      return ok(processedFileContent);
    } catch (e) {
      return err(new ReadFileError());
    }
  } else {
    return err(new FileNotFoundError("ResolveManifestFunction", filePath));
  }
}

// TODO: better error message and localize.
class UnsupportedFileFormatError extends UserError {
  constructor() {
    const errorOptions: UserErrorOptions = {
      source,
      name: "UnsupportedFileFormat",
      message: "Only Txt file is supported",
      displayMessage: "Only Txt file is supported",
    };
    super(errorOptions);
  }
}

class InvalidFunctionError extends UserError {
  constructor() {
    const errorOptions: UserErrorOptions = {
      source,
      name: "InvalidFunction",
      message: "The function is invalid. Supported function: file",
      displayMessage: "The function is invalid. Supported function: file",
    };
    super(errorOptions);
  }
}

class InvalidFunctionParameter extends UserError {
  constructor() {
    const errorOptions: UserErrorOptions = {
      source,
      name: "InvalidFunctionParameter",
      message: "The function parameter is invalid.",
      displayMessage: "The function parameter is invalid.",
    };
    super(errorOptions);
  }
}

class ReadFileError extends UserError {
  constructor() {
    const errorOptions: UserErrorOptions = {
      source,
      name: "ReadFileError",
      message: "Error while reading file.",
      displayMessage: "Error while reading file.",
    };
    super(errorOptions);
  }
}
