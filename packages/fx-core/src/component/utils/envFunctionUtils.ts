// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  err,
  FxError,
  ok,
  Platform,
  Result,
  UserError,
  UserErrorOptions,
} from "@microsoft/teamsfx-api";
import path from "path";
import fs from "fs-extra";
import stripBom from "strip-bom";
import { FileNotFoundError } from "../../error";
import { expandEnvironmentVariable, getAbsolutePath } from "./common";
import { getLocalizedString } from "../../common/localizeUtils";
import { featureFlagManager, FeatureFlags } from "../../common/featureFlags";
import { DriverContext } from "../driver/interface/commonArgs";

const source = "ResolveManifestFunction";
const telemetryEvent = "manifest-with-function";
const helpLink = "https://aka.ms";

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
  ctx: DriverContext,
  envs: { [key in string]: string } | undefined,
  isJson: boolean,
  manifestType: ManifestType
): Promise<Result<string, FxError>> {
  if (!featureFlagManager.getBooleanValue(FeatureFlags.EnvFileFunc)) {
    return ok(content);
  }
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
    ctx.telemetryReporter.sendTelemetryEvent(telemetryEvent, {
      [TelemetryPropertyKey.manifestType]: manifestType.toString(),
      [TelemetryPropertyKey.functionCount]: count.toString(),
    });
  }
  return ok(content);
}

async function processFunction(
  content: string,
  ctx: DriverContext,
  envs: { [key in string]: string } | undefined
): Promise<Result<string, FxError>> {
  const firstTrimmedContent = content.trim();
  if (!firstTrimmedContent.startsWith("file(") || !firstTrimmedContent.endsWith(")")) {
    ctx.logProvider.error(
      getLocalizedString("core.envFunc.unsupportedFunction.errorLog", firstTrimmedContent, "file")
    );
    return err(new InvalidFunctionError(ctx.platform));
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
    ctx.logProvider.error(
      getLocalizedString("core.envFunc.invalidFunctionParameter.errorLog", trimmedParameter)
    );
    return err(new InvalidFunctionParameter(ctx.platform));
  }
}

async function readFileContent(
  filePath: string,
  ctx: DriverContext,
  envs: { [key in string]: string } | undefined
): Promise<Result<string, FxError>> {
  const ext = path.extname(filePath);
  if (ext.toLowerCase() !== ".txt") {
    ctx.logProvider.error(
      getLocalizedString("core.envFunc.unsupportedFile.errorLog", filePath, "txt")
    );
    return err(new UnsupportedFileFormatError(ctx.platform));
  }

  const absolutePath = getAbsolutePath(filePath, ctx.projectPath);
  if (await fs.pathExists(absolutePath)) {
    try {
      let fileContent = await fs.readFile(absolutePath, "utf8");
      fileContent = stripBom(fileContent);
      const processedFileContent = expandEnvironmentVariable(fileContent, envs);
      return ok(processedFileContent);
    } catch (e) {
      ctx.logProvider.error(
        getLocalizedString("core.envFunc.readFile.errorLog", absolutePath, e?.toString())
      );
      return err(new ReadFileError(ctx.platform, absolutePath));
    }
  } else {
    return err(new FileNotFoundError(source, filePath));
  }
}

class UnsupportedFileFormatError extends UserError {
  constructor(platform: Platform | undefined) {
    const message =
      platform === Platform.VSCode
        ? getLocalizedString("core.envFunc.unsupportedFile.errorMessage.vsc")
        : getLocalizedString("core.envFunc.unsupportedFile.errorMessage");
    const errorOptions: UserErrorOptions = {
      source,
      name: "UnsupportedFileFormat",
      message,
      displayMessage: message,
      helpLink,
    };
    super(errorOptions);
  }
}

class InvalidFunctionError extends UserError {
  constructor(platform: Platform) {
    const message =
      platform === Platform.VSCode
        ? getLocalizedString("core.envFunc.unsupportedFunction.errorMessage.vsc")
        : getLocalizedString("core.envFunc.unsupportedFunction.errorMessage");
    const errorOptions: UserErrorOptions = {
      source,
      name: "InvalidFunction",
      message,
      displayMessage: message,
      helpLink,
    };
    super(errorOptions);
  }
}

class InvalidFunctionParameter extends UserError {
  constructor(platform: Platform) {
    const message =
      platform === Platform.VSCode
        ? getLocalizedString("core.envFunc.invalidFunctionParameter.errorMessage.vsc", "file")
        : getLocalizedString("core.envFunc.invalidFunctionParameter.errorMessage", "file");
    const errorOptions: UserErrorOptions = {
      source,
      name: "InvalidFunctionParameter",
      message,
      displayMessage: message,
      helpLink,
    };
    super(errorOptions);
  }
}

class ReadFileError extends UserError {
  constructor(platform: Platform, filePath: string) {
    const message =
      platform === Platform.VSCode
        ? getLocalizedString("core.envFunc.readFile.errorMessage.vsc", filePath)
        : getLocalizedString("core.envFunc.readFile.errorMessage", filePath);
    const errorOptions: UserErrorOptions = {
      source,
      name: "ReadFileError",
      message,
      displayMessage: message,
      helpLink,
    };
    super(errorOptions);
  }
}
