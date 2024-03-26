// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
export class Spec {
  public userInput: string;
  public taskSummary: string;
  public sections: string[];
  public inspires: string[];
  public resources: string[];
  public appendix: {
    host: string;
    codeSnippet: string;
    codeExplanation: string;
    codeTaskBreakdown: string[];
  };

  constructor(userInput: string) {
    this.userInput = userInput;
    this.taskSummary = "";
    this.sections = [];
    this.inspires = [];
    this.resources = [];
    this.appendix = { host: "", codeSnippet: "", codeExplanation: "", codeTaskBreakdown: [] };
  }
}
