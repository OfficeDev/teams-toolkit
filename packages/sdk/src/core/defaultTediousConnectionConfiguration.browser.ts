// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { ErrorWithCode, ErrorCode, ErrorMessage } from "./errors";
import { ConnectionConfig } from "tedious";
import { formatString } from "../util/utils";
import { SqlConfiguration } from "../models/configuration";

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

/**
 * @returns SQL configuration which is constructed from predefined env variables.
 *
 * @remarks
 * Used variables: SQL_ENDPOINT, SQL_USER_NAME, SQL_PASSWORD, SQL_DATABASE_NAME, IDENTITY_ID
 *
 * @beta
 */
export function getSqlConfigFromEnv(): SqlConfiguration {
  throw new ErrorWithCode(
    formatString(ErrorMessage.BrowserRuntimeNotSupported, "getSqlConfigFromEnv"),
    ErrorCode.RuntimeNotSupported
  );
}
