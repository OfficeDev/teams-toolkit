// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { Argv } from "yargs";

import { isGAPreviewEnabled } from "@microsoft/teamsfx-core";

import { YargsCommand } from "../yargsCommand";
import Account from "./account";
import New from "./new";
import Add from "./add";
import Capability from "./capability";
import Resource from "./resource";
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
import { ManifestValidate } from "./validate";
import { isDeployManifestEnabled } from "@microsoft/teamsfx-core";

export const commands: YargsCommand[] = [
  new Account(),
  new New(),
  new Add(),
  ...(isGAPreviewEnabled() ? [] : [new Capability(), new Resource()]),
  new Provision(),
  new Deploy(),
  new Package(),
  new Manifest(),
  new ManifestValidate(),
  new Publish(),
  new Config(),
  new Preview(),
  new Env(),
];

if (isDeployManifestEnabled()) {
  commands.splice(8, 1);
}

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
}
