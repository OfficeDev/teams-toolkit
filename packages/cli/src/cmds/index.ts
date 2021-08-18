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
import Init from "./init";
import Publish from "./publish";
import Build from "./build";
import Validate from "./validate";
import Config from "./config";
import Preview from "./preview/preview";
import { isRemoteCollaborationEnabled } from "../utils";
import Permission from "./permission";

export const commands: YargsCommand[] = [
  new Account(),
  new New(),
  new Capability(),
  new Resource(),
  new Provision(),
  new Deploy(),
  new Init(),
  new Build(),
  new Validate(),
  new Publish(),
  new Config(),
  new Preview(),
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
}
