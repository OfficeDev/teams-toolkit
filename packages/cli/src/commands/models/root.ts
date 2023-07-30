// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { FooterText } from "../../constants";
import { getVersion } from "../../utils";
import { CLICommand } from "../types";
import { accountCommand } from "./account";
import { addCommand } from "./add";
import { configCommand } from "./config";
import { createCommand } from "./create";
import { deployCommand } from "./deploy";
import { envCommand } from "./env";
import { m365Command } from "./m365";
import { packageCommand } from "./package";
import { permissionCommand } from "./permission";
import { previewCommand } from "./preview";
import { provisionCommand } from "./provision";
import { publishCommand } from "./publish";
import { updateCommand } from "./update";
import { upgradeCommand } from "./upgrade";
import { validateCommand } from "./validate";

export const rootCommand: CLICommand = {
  name: "teamsfx",
  fullName: "teamsfx",
  description: "Teams toolkit CLI.",
  version: getVersion(),
  footer: FooterText,
  commands: [
    accountCommand,
    createCommand,
    addCommand,
    provisionCommand,
    deployCommand,
    packageCommand,
    validateCommand,
    publishCommand,
    configCommand,
    previewCommand,
    envCommand,
    permissionCommand,
    updateCommand,
    upgradeCommand,
    m365Command,
  ],
  options: [
    {
      type: "boolean",
      name: "version",
      shortName: "v",
      description: "Show version number.",
    },
    {
      type: "boolean",
      name: "help",
      shortName: "h",
      description: "Show help message.",
    },
    {
      type: "boolean",
      name: "interactive",
      shortName: "i",
      description: "Run the command in interactive mode.",
      default: true,
    },
    {
      type: "boolean",
      name: "debug",
      description: "Print debug information.",
      default: false,
    },
    {
      type: "boolean",
      name: "verbose",
      description: "Print diagnostic information.",
      default: false,
    },
  ],
};
