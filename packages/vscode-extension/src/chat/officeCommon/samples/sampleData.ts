// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
export class SampleData {
  docLink: string;
  sample: string;
  scenario: string;
  name: string;
  definition: string;
  usage: string;

  constructor(
    name: string,
    docLink: string,
    sample: string,
    scenario: string,
    definition: string,
    usage: string
  ) {
    this.docLink = docLink;
    this.sample = sample;
    this.scenario = scenario;
    this.name = name;
    this.definition = definition;
    this.usage = usage;
  }
}
