// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ConnectionConfig } from "tedious";
import { ErrorWithCode, ErrorCode, ErrorMessage } from "../core/errors";
import { TeamsFx } from "../core/teamsfx";
import { formatString } from "../util/utils";

/**
 * Generate connection configuration consumed by tedious.
 *
 * @deprecated we recommend you compose your own Tedious configuration for better flexibility.
 *
 * @remarks
 * Only works in in server side.
 */
export function getTediousConnectionConfig(
  teamsfx: TeamsFx,
  databaseName?: string
): Promise<ConnectionConfig> {
  return Promise.reject(
    new ErrorWithCode(
      formatString(
        ErrorMessage.BrowserRuntimeNotSupported,
        "DefaultTediousConnectionConfiguration"
      ),
      ErrorCode.RuntimeNotSupported
    )
  );
}
