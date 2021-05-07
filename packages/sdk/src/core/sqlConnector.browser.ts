// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { ErrorWithCode, ErrorCode, ErrorMessage } from "./errors";
import { ConnectionConfig } from "tedious";
import { formatString } from "../util/utils";

/**
 * Generate connection configuration consumed by tedious.
 * 
 * @returns Configuration items to the user for tedious to connection to the SQL.
 * 
 * @throws {@link ErrorCode|InvalidConfiguration} when SQL config resource configuration is invalid.
 * @throws {@link ErrorCode|InternalError} when get user MSI token failed or MSI token is invalid.
 * @throws {@link ErrorCode|RuntimeNotSupported} when runtime is browser.
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
   * @returns Configuration items to the user for tedious to connection to the SQL.
   * @throws {@link ErrorCode|RuntimeNotSupported} if runtime is browser
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
