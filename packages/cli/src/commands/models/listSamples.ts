// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand, ok } from "@microsoft/teamsfx-api";
import { logger } from "../../commonlib/logger";
import { TelemetryEvent } from "../../telemetry/cliTelemetryEvents";
import { Sample, getTemplates } from "../../utils";
import Table from "cli-table3";
import chalk from "chalk";
import wrap from "word-wrap";

export const listSamplesCommand: CLICommand = {
  name: "samples",
  description: "List all Teams App samples.",
  options: [
    {
      name: "tag",
      shortName: "t",
      description: "Specifies the tag to filter the samples.",
      type: "string",
    },
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
      result = jsonToTable(samples);
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

function jsonToTable(samples: Sample[]): string {
  const table = new Table({
    head: [chalk.cyanBright("Sample"), chalk.cyanBright("Tags"), chalk.cyanBright("Description")],
    colAligns: ["left", "left", "left"],
    colWidths: [null, 20, null],
    wordWrap: true,
  });
  let maxUrlLength = 0;
  samples.forEach((sample) => {
    if (sample.url && sample.url.length > maxUrlLength) {
      maxUrlLength = sample.url.length;
    }
  });
  samples.forEach((sample) => {
    table.push([
      sample.name + chalk.gray("\nid: " + sample.id),
      chalk.gray(sample.tags.join(", ")),
      wrap(chalk.gray(sample.description), {
        width: maxUrlLength,
        indent: "",
      }) +
        "\n" +
        (sample.url ? chalk.underline.blue(sample.url) : ""),
    ]);
  });
  return table.toString();
}
