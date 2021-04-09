// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { ErrorWithCode, ErrorCode, ErrorMessage } from "./errors";
import { ConnectionConfig } from "tedious";
import { formatString } from "../util/utils";

/**
 * SQL connection configuration instance.
 *
 * @throws {RuntimeNotSupported} if runtime is browser
 *
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
   *
   * @returns return configuration items to the user for tedious to connection to the SQL.
   * @throws {RuntimeNotSupported} if runtime is browser
   *
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
