// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { logger } from "../commonlib/logger";
import { engine } from "./engine";
import { rootCommand } from "./models/root";

export async function start(binName: "teamsfx" | "teamsapp"): Promise<void> {
  rootCommand.name = binName;
  rootCommand.fullName = binName;
  if (binName === "teamsfx") {
    logger.warning(
      `
**********************************************************************************
* Warning: command 'teamsfx' is deprecated and will be replaced with 'teamsapp'. *
**********************************************************************************/
`
    );
  }
  await engine.start(rootCommand);
  process.exit(0);
}
