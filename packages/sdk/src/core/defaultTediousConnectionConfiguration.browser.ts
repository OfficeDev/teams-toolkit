// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { ErrorWithCode, ErrorCode, ErrorMessage } from "./errors";
import { ConnectionConfig } from "tedious";
import { formatString } from "../util/utils";

/**
 * Generate connection configuration consumed by tedious.
 * @remarks
 * Only works in in server side.
 * @beta
 */
export class DefaultTediousConnectionConfiguration {
  constructor() {
    throw new ErrorWithCode(
      formatString(
        ErrorMessage.BrowserRuntimeNotSupported,
        "DefaultTediousConnectionConfiguration"
      ),
      ErrorCode.RuntimeNotSupported
    );
  }

  /**
   * Generate connection configuration consumed by tedious.
   * @remarks
   * Only works in in server side.
   * @beta
   */
  public async getConfig(): Promise<ConnectionConfig> {
    throw new ErrorWithCode(
      formatString(
        ErrorMessage.BrowserRuntimeNotSupported,
        "DefaultTediousConnectionConfiguration"
      ),
      ErrorCode.RuntimeNotSupported
    );
  }
}
