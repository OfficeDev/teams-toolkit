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
  ],
  defaultInteractiveOption: false,
  handler: async (cmd) => {
    let samples = await getTemplates();
    const tag = cmd.optionValues.tag as string;
    if (tag) {
      samples = samples.filter((sample) =>
        sample.tags.map((t) => t.toLowerCase()).includes(tag.toLowerCase())
      );
    }
    const table = jsonToTable(samples);
    logger.info(table);
    return ok(undefined);
  },
  telemetry: {
    event: TelemetryEvent.ListSample,
  },
};

function jsonToTable(samples: Sample[]): string {
  const table = new Table({
    head: [chalk.cyanBright("Name"), chalk.cyanBright("Tags"), chalk.cyanBright("Description")],
    colAligns: ["left", "left", "left"],
    colWidths: [25, 20, null],
    wordWrap: true,
  });

  let maxDescpLength = 0;

  samples.forEach((sample) => {
    if (sample.url && sample.url.length > maxDescpLength) {
      maxDescpLength = sample.url.length;
    }
  });

  samples.forEach((sample) => {
    table.push([
      sample.name,
      sample.tags.join(", "),
      wrap(sample.description, { width: maxDescpLength, indent: "" }) +
        "\n" +
        (sample.url ? chalk.underline.blue(sample.url) : ""),
    ]);
  });
  return table.toString();
}
