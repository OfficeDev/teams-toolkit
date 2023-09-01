// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand, OptionItem, Platform, ok } from "@microsoft/teamsfx-api";
import { CapabilityOptions } from "@microsoft/teamsfx-core";
import chalk from "chalk";
import Table from "cli-table3";
import { logger } from "../../commonlib/logger";
import { TelemetryEvent } from "../../telemetry/cliTelemetryEvents";
import { ListFormatOption, ShowDescriptionOption } from "../common";

export const listTemplatesCommand: CLICommand = {
  name: "templates",
  description: "List available Microsoft Teams application templates.",
  options: [ListFormatOption, ShowDescriptionOption],
  defaultInteractiveOption: false,
  handler: (ctx) => {
    const format = ctx.optionValues.format;
    let result;
    if (format === "table") {
      result = jsonToTable(
        CapabilityOptions.all({ platform: Platform.CLI }),
        ctx.optionValues.description as boolean
      );
    } else {
      result = JSON.stringify(CapabilityOptions.all({ platform: Platform.CLI }), null, 2);
    }
    logger.info(result);
    return ok(undefined);
  },
  telemetry: {
    event: TelemetryEvent.ListSample,
  },
};

function jsonToTable(capabilities: OptionItem[], showDescription = false): string {
  let maxUrlLength = 0;
  let maxIdLength = 0;
  let maxLabelLength = 0;
  capabilities.forEach((item) => {
    if (item.data && (item.data as string).length > maxUrlLength) {
      maxUrlLength = (item.data as string).length;
    }
    if (item.id.length > maxIdLength) {
      maxIdLength = item.id.length;
    }
    if (item.label.length > maxLabelLength) {
      maxLabelLength = item.label.length;
    }
  });
  maxUrlLength += 2;
  maxIdLength += 2;
  maxLabelLength += 2;

  maxUrlLength = Math.max(80, maxUrlLength);

  const terminalWidth = process.stdout.isTTY ? process.stdout.columns : 80;

  const table = new Table({
    head: showDescription
      ? [chalk.cyanBright("ID"), chalk.cyanBright("Label"), chalk.cyanBright("Description")]
      : [chalk.cyanBright("ID"), chalk.cyanBright("Label")],
    colAligns: showDescription ? ["left", "left", "left"] : ["left", "left"],
    colWidths: showDescription
      ? [
          maxIdLength,
          Math.min(20, maxLabelLength),
          Math.min(maxUrlLength, terminalWidth - maxIdLength - Math.min(20, maxLabelLength) - 4),
        ]
      : [maxIdLength, Math.min(maxLabelLength, terminalWidth - maxIdLength - 3)],
    wordWrap: true,
  });
  capabilities.forEach((item) => {
    const row = [item.id, chalk.gray(item.label)];
    if (showDescription) {
      row.push(
        chalk.gray([item.description, item.detail].filter((i) => !!i).join(". ")) +
          "\n" +
          (item.data ? chalk.underline.blue(item.data) : "")
      );
    }
    table.push(row);
  });
  return table.toString();
}
