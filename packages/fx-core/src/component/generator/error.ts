// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { BaseComponentInnerError } from "../error/componentError";

export class TemplateZipFallbackError extends BaseComponentInnerError {
  constructor() {
    super(
      "generate",
      "SystemError",
      "TemplateZipFallbackError",
      "error.generator.TemplateZipFallbackError"
    );
  }
}

export class UnzipError extends BaseComponentInnerError {
  constructor() {
    super("generate", "SystemError", "UnzipError", "error.generator.UnzipError", undefined, [
      "plugins.frontend.checkFsPermissionsTip",
    ]);
  }
}

export class FetchZipFromUrlError extends BaseComponentInnerError {
  constructor(url: string) {
    super(
      "generate",
      "SystemError",
      "FetchZipFromUrlError",
      "error.generator.FetchZipFromUrlError",
      [url],
      ["plugins.frontend.checkNetworkTip"]
    );
  }
}

export class FetchSampleUrlWithTagError extends BaseComponentInnerError {
  constructor() {
    super(
      "generate",
      "SystemError",
      "FetchSampleUrlWithTagError",
      "error.generator.FetchSampleUrlWithTagError",
      undefined,
      ["plugins.frontend.checkNetworkTip"]
    );
  }
}

export class MissKeyError extends BaseComponentInnerError {
  constructor(keyName: string) {
    super("generate", "SystemError", "MissKeyError", "error.generator.MissKeyError", [keyName]);
  }
}
