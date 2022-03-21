// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { Argv } from "yargs";

import { YargsCommand } from "../yargsCommand";
import Account from "./account";
import New from "./new";
import Capability from "./capability";
import Resource from "./resource";
import Provision from "./provision";
import Deploy from "./deploy";
import Publish from "./publish";
import Package from "./package";
import Config from "./config";
import Preview from "./preview/preview";
import { isRemoteCollaborationEnabled } from "../utils";
import Permission from "./permission";
import Env from "./env";
import { ManifestValidate } from "./validate";
import Init from "./init";
import { isInitAppEnabled } from "@microsoft/teamsfx-core";

export const commands: YargsCommand[] = [
  new Account(),
  new New(),
  new Capability(),
  new Resource(),
  new Provision(),
  new Deploy(),
  new Package(),
  new ManifestValidate(),
  new Publish(),
  new Config(),
  new Preview(),
  new Env(),
];

if (isInitAppEnabled()) {
  // add Init command after the New command.
  commands.splice(2, 0, new Init());
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
