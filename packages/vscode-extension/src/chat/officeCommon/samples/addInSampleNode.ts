// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { SampleData } from "./sampleData"; // Import the content of apiSamples.json

// A sample could contains multiple nested samples and multiple real sample codes for different scenarios
export class AddinSampleNode {
  Name: string;
  // this is for nested samples
  // For example, the Excel is a sample, it Workbooks is it's nested sample
  nestedSampleNode: Map<string, AddinSampleNode>;

  // this is for real sample code
  // The key is the scenario description, the value is the code
  sampleCode: SampleData | undefined;

  constructor(name: string) {
    this.Name = name;
    this.nestedSampleNode = new Map<string, AddinSampleNode>();
  }

  public addNestedSampleNode(name: string): AddinSampleNode {
    if (!this.nestedSampleNode.has(name)) {
      this.nestedSampleNode.set(name, new AddinSampleNode(name));
    }
    const node = this.nestedSampleNode.get(name);
    if (!node) {
      throw new Error("The nested sample node is not found");
    }

    return node;
  }

  public getNestedSampleNode(name: string): AddinSampleNode | undefined {
    return this.nestedSampleNode.get(name);
  }

  public getSampleCode(): SampleData | undefined {
    return this.sampleCode;
  }

  public addSample(
    name: string,
    docLink: string,
    code: string,
    scenario: string,
    definition: string,
    usage: string
  ) {
    this.sampleCode = new SampleData(name, docLink, code, scenario, definition, usage);
  }
}
