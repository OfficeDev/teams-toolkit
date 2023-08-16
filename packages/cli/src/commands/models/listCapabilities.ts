// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand, OptionItem, ok } from "@microsoft/teamsfx-api";
import { CapabilityOptions } from "@microsoft/teamsfx-core";
import { logger } from "../../commonlib/logger";
import { TelemetryEvent } from "../../telemetry/cliTelemetryEvents";
import Table from "cli-table3";
import chalk from "chalk";
import wrap from "word-wrap";

export const listCapabilitiesCommand: CLICommand = {
  name: "capabilities",
  description: "List all Teams App tempalte capabilities.",
  options: [
    {
      name: "format",
      shortName: "f",
      description: "Specifies the format of the results.",
      type: "string",
      choices: ["table", "json"],
      default: "table",
      required: true,
    },
  ],
  defaultInteractiveOption: false,
  handler: (ctx) => {
    const format = ctx.optionValues.format;
    let result;
    if (format === "table") {
      result = jsonToTable(CapabilityOptions.all());
    } else {
      result = JSON.stringify(CapabilityOptions.all(), null, 2);
    }
    logger.info(result);
    return ok(undefined);
  },
  telemetry: {
    event: TelemetryEvent.ListSample,
  },
};

function jsonToTable(capabilities: OptionItem[]): string {
  const table = new Table({
    head: [chalk.cyanBright("ID"), chalk.cyanBright("Label"), chalk.cyanBright("Description")],
    colAligns: ["left", "left", "left"],
    colWidths: [null, 20, null],
    wordWrap: true,
  });
  capabilities.forEach((item) => {
    table.push([
      item.id,
      chalk.gray(item.label),
      wrap(chalk.gray([item.description, item.detail].filter((i) => !!i).join(". ")), {
        width: 80,
        indent: "",
      }) +
        "\n" +
        (item.data ? chalk.underline.blue(item.data) : ""),
    ]);
  });
  return table.toString();
}
