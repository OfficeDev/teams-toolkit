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
export async function expandVariableWithFunction(
  content: string,
  ctx: WrapDriverContext | undefined,
  envs: { [key in string]: string } | undefined,
  isJson: boolean
): Promise<Result<string, FxError>> {
  const regex = /\$\[ *[a-zA-Z][a-zA-Z]*\([^\]]*\) *\]/g;
  const matches = content.match(regex);

  if (!matches) {
    return ok(content); // no function
  }
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
      // count +1  to check the count of file function for telemetry purpose
      console.log("value");
      console.log(value);
      content = content.replace(placeholder, value);
    }
  }
  return ok(content);
}

export async function processFunction(
  content: string,
  ctx: WrapDriverContext | undefined,
  envs: { [key in string]: string } | undefined
): Promise<Result<string, FxError>> {
  const firstTrimmedContent = content.trim();
  if (!firstTrimmedContent.startsWith("file(") || !firstTrimmedContent.endsWith(")")) {
    return err(new InvalidFunction());
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
    ctx?.logProvider.error(
      "the parameter is invalid. It can be '', \"\", ${{}} or a nested function"
    );

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
    return err(new UnsupportedFileFormat());
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

export enum ManifestType {
  TeamsManifest = "teams-manifest",
  PluginManifest = "plugin-manifest",
  DeclarativeCopilotManifest = "declarative-copilot-manifest",
  ApiSpec = "api-spec",
}

// TODO: better error message and localize.
export class UnsupportedFileFormat extends UserError {
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

export class InvalidFunction extends UserError {
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

export class InvalidFunctionParameter extends UserError {
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

export class ReadFileError extends UserError {
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
