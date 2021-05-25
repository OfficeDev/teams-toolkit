// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  LogProvider,
  OptionItem,
  PluginContext,
  TelemetryReporter,
  Question,
  ValidationSchema,
} from "@microsoft/teamsfx-api";

export interface IQuestionService {
  // Control whether the question is displayed to the user.
  condition?(parentAnswerPath: string): { target?: string } & ValidationSchema;

  // Define the method name
  funcName?: string;

  // Generate the options / default value / answer of the question.
  executeFunc?(ctx: PluginContext): Promise<string | OptionItem | OptionItem[]>;

  // Generate the question
  getQuestion(ctx: PluginContext): Question;
}

export class BaseQuestionService {
  protected readonly logger?: LogProvider;
  protected readonly telemetryReporter?: TelemetryReporter;

  constructor(telemetryReporter?: TelemetryReporter, logger?: LogProvider) {
    this.telemetryReporter = telemetryReporter;
    this.logger = logger;
  }
}
