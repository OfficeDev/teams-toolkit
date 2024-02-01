// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand, ok } from "@microsoft/teamsfx-api";
import chalk from "chalk";
import Table from "cli-table3";
import { logger } from "../../commonlib/logger";
import { TelemetryEvent } from "../../telemetry/cliTelemetryEvents";
import { Sample, getTemplates } from "../../utils";
import { ListFormatOption, ShowDescriptionOption } from "../common";

export const listSamplesCommand: CLICommand = {
  name: "samples",
  description: "List available Microsoft Teams application samples.",
  options: [
    {
      name: "tag",
      shortName: "t",
      description: "Specifies the tag to filter the samples.",
      type: "string",
    },
    ListFormatOption,
    ShowDescriptionOption,
  ],
  defaultInteractiveOption: false,
  handler: async (ctx) => {
    let samples = await getTemplates();
    const tag = ctx.optionValues.tag as string;
    if (tag) {
      samples = samples.filter((sample) =>
        sample.tags.map((t) => t.toLowerCase()).includes(tag.toLowerCase())
      );
    }
    const format = ctx.optionValues.format;
    let result;
    if (format === "table") {
      result = jsonToTable(samples, ctx.optionValues.description as boolean);
    } else {
      result = JSON.stringify(samples, null, 2);
    }
    logger.info(result);
    return ok(undefined);
  },
  telemetry: {
    event: TelemetryEvent.ListSample,
  },
};

function jsonToTable(samples: Sample[], showDescription = false): string {
  let maxUrlLength = 0;
  let maxIdLength = 0;
  let maxTagLength = 0;
  samples.forEach((sample) => {
    if (sample.url && sample.url.length > maxUrlLength) {
      maxUrlLength = sample.url.length;
    }
    if (("id: " + sample.id).length > maxIdLength) {
      maxIdLength = ("id: " + sample.id).length;
    }
    const tag = sample.tags.join(", ");
    if (tag.length > maxTagLength) {
      maxTagLength = tag.length;
    }
  });
  maxUrlLength += 2;
  maxIdLength += 2;
  maxTagLength += 2;

  const terminalWidth = process.stdout.isTTY ? process.stdout.columns : 80;
  const colWidths = showDescription
    ? [
        maxIdLength,
        Math.min(20, maxTagLength),
        Math.min(maxUrlLength, terminalWidth - maxIdLength - Math.min(20, maxTagLength) - 4),
      ]
    : [maxIdLength, Math.min(maxTagLength, terminalWidth - maxIdLength - 3)];
  const table = new Table({
    head: showDescription
      ? [chalk.cyanBright("Sample"), chalk.cyanBright("Tags"), chalk.cyanBright("Description")]
      : [chalk.cyanBright("Sample"), chalk.cyanBright("Tags")],
    colAligns: showDescription ? ["left", "left", "left"] : ["left", "left"],
    colWidths: colWidths,
    wordWrap: true,
  });

  samples.forEach((sample) => {
    const row = [
      sample.name + chalk.gray("\nid: " + sample.id),
      chalk.gray(sample.tags.join(", ")),
    ];
    if (showDescription) {
      row.push(
        chalk.gray(sample.description) + "\n" + (sample.url ? chalk.underline.blue(sample.url) : "")
      );
    }
    table.push(row);
  });
  return table.toString();
}
