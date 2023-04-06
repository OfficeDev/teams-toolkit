// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { Argv } from "yargs";

import { isDeployManifestEnabled, isV3Enabled } from "@microsoft/teamsfx-core/build/common/tools";
import { YargsCommand } from "../yargsCommand";
import Account from "./account";
import New from "./new";
import Add from "./add";
import Provision from "./provision";
import Deploy from "./deploy";
import Publish from "./publish";
import Package from "./package";
import Config from "./config";
import Preview from "./preview/preview";
import PreviewEnv from "./preview/previewEnv";
import { isRemoteCollaborationEnabled } from "../utils";
import Manifest from "./manifest";
import Permission from "./permission";
import Env from "./env";
import M365 from "./m365/m365";
import { ManifestValidate } from "./validate";
import Update from "./update";
import Init from "./init";
import Upgrade from "./upgrade";

export const commands: YargsCommand[] = [
  new Account(),
  new New(),
  new Add(),
  new Provision(),
  new Deploy(),
  new Package(),
  ...(isDeployManifestEnabled() ? [] : [new Manifest()]),
  new ManifestValidate(),
  new Publish(),
  new Config(),
  isV3Enabled() ? new PreviewEnv() : new Preview(),
  new Env(),
];

/**
 * Registers cli and partner commands with yargs.
 * @param yargs
 */
export function registerCommands(yargs: Argv): void {
  if (isRemoteCollaborationEnabled()) {
    commands.push(new Permission());
  }
  if (isV3Enabled()) {
    // commands.push(new Init());
    commands.push(new Update());
    commands.push(new Upgrade());
  }

  commands.forEach((command) => {
    yargs.command(
      command.command,
      command.description,
      command.builder.bind(command),
      command.handler.bind(command)
    );
  });

  // hide this since it's in preview
  const m365 = new M365();
  yargs.command(m365.command, false, m365.builder.bind(m365), m365.handler.bind(m365));
}
