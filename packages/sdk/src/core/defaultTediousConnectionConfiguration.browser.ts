// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ConnectionConfig } from "tedious";
import { ErrorWithCode, ErrorCode, ErrorMessage } from "../core/errors";
import { TeamsFx } from "../core/teamsfx";
import { formatString } from "../util/utils";

/**
 * Generate connection configuration consumed by tedious.
 * @remarks
 * Only works in in server side.
 */
export async function getTediousConnectionConfig(
  teamsfx: TeamsFx,
  databaseName?: string
): Promise<ConnectionConfig> {
  throw new ErrorWithCode(
    formatString(ErrorMessage.BrowserRuntimeNotSupported, "DefaultTediousConnectionConfiguration"),
    ErrorCode.RuntimeNotSupported
  );
}
