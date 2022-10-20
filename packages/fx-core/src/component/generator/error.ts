// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { BaseComponentInnerError } from "../error/componentError";
import { errorSource } from "./constant";

export class TemplateZipFallbackError extends BaseComponentInnerError {
  constructor() {
    super(
      errorSource,
      "SystemError",
      "TemplateZipFallbackError",
      "error.generator.TemplateZipFallbackError"
    );
  }
}

export class UnzipError extends BaseComponentInnerError {
  constructor() {
    super(errorSource, "SystemError", "UnzipError", "error.generator.UnzipError", undefined, [
      "plugins.frontend.checkFsPermissionsTip",
    ]);
  }
}

export class FetchZipFromUrlError extends BaseComponentInnerError {
  constructor(url: string, innerError: Error) {
    super(
      errorSource,
      "SystemError",
      "FetchZipFromUrlError",
      "error.generator.FetchZipFromUrlError",
      [url],
      ["plugins.frontend.checkNetworkTip"],
      innerError.message
    );
  }
}

export class FetchSampleUrlWithTagError extends BaseComponentInnerError {
  constructor(innerError: Error) {
    super(
      errorSource,
      "SystemError",
      "FetchSampleUrlWithTagError",
      "error.generator.FetchSampleUrlWithTagError",
      undefined,
      ["plugins.frontend.checkNetworkTip"],
      innerError.message
    );
  }
}

export class MissKeyError extends BaseComponentInnerError {
  constructor(keyName: string) {
    super("generate", "SystemError", "MissKeyError", "error.generator.MissKeyError", [keyName]);
  }
}
