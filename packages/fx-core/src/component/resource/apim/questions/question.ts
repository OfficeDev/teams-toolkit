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

  // Generate the question
  getQuestion(ctx: PluginContext): Question;
}

export class BaseQuestionService {
  protected readonly logger: LogProvider | undefined;
  protected readonly telemetryReporter: TelemetryReporter | undefined;

  constructor(telemetryReporter?: TelemetryReporter, logger?: LogProvider) {
    this.telemetryReporter = telemetryReporter;
    this.logger = logger;
  }
}
