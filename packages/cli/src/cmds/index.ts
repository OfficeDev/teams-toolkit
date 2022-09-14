// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { Argv } from "yargs";

import { isDeployManifestEnabled } from "@microsoft/teamsfx-core";

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
import { isRemoteCollaborationEnabled } from "../utils";
import Manifest from "./manifest";
import Permission from "./permission";
import Env from "./env";
import M365 from "./m365/m365";
import { ManifestValidate } from "./validate";

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
  new Preview(),
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
