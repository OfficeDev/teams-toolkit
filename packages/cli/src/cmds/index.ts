// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Argv } from "yargs";
import { isRemoteCollaborationEnabled } from "../utils";
import { YargsCommand } from "../yargsCommand";
import Account from "./account";
import Add from "./add";
import Config from "./config";
import Deploy from "./deploy";
import Env from "./env";
import M365 from "./m365/m365";
import New from "./new";
import Package from "./package";
import Permission from "./permission";
import PreviewEnv from "./preview/previewEnv";
import Provision from "./provision";
import Publish from "./publish";
import Update from "./update";
import Upgrade from "./upgrade";
import { ManifestValidate } from "./validate";

export const commands: YargsCommand[] = [
  new Account(),
  new New(),
  new Add(),
  new Provision(),
  new Deploy(),
  new Package(),
  new ManifestValidate(),
  new Publish(),
  new Config(),
  new PreviewEnv(),
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
  commands.push(new Update());
  commands.push(new Upgrade());

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
