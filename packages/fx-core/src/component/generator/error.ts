// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { BaseComponentInnerError } from "../error/componentError";
import { errorSource } from "./constant";

export class CancelDownloading extends Error {}

export class SampleNotFoundError extends BaseComponentInnerError {
  constructor(templateName: string) {
    super(
      errorSource,
      "SystemError",
      "SampleNotFoundError",
      "error.generator.SampleNotFoundError",
      [templateName]
    );
  }
}

export class TemplateNotFoundError extends BaseComponentInnerError {
  constructor(templateName: string) {
    super(
      errorSource,
      "SystemError",
      "TemplateNotFoundError",
      "error.generator.TemplateNotFoundError",
      [templateName]
    );
  }
}

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

export class DownloadSampleNetworkError extends BaseComponentInnerError {
  constructor(url: string) {
    super(
      errorSource,
      "UserError",
      "DownloadSampleNetworkError",
      "error.generator.DownloadSampleNetworkError",
      [url]
    );
  }
}

export class DownloadSampleApiLimitError extends BaseComponentInnerError {
  constructor(url: string) {
    super(
      errorSource,
      "UserError",
      "DownloadSampleApiLimitError",
      "error.generator.DownloadSampleApiLimitError",
      [url]
    );
  }
}

export class ParseUrlError extends BaseComponentInnerError {
  constructor(url: string) {
    super(errorSource, "SystemError", "ParseUrlError", "error.generator.ParseUrlError", [url]);
  }
}

export class FetchZipFromUrlError extends BaseComponentInnerError {
  constructor(url: string, error?: Error) {
    super(
      errorSource,
      "SystemError",
      "FetchZipFromUrlError",
      "error.generator.FetchZipFromUrlError",
      [url],
      ["plugins.frontend.checkNetworkTip"],
      undefined,
      undefined,
      error
    );
  }
}

export class MissKeyError extends BaseComponentInnerError {
  constructor(keyName: string) {
    super(errorSource, "SystemError", "MissKeyError", "error.generator.MissKeyError", [keyName]);
  }
}
