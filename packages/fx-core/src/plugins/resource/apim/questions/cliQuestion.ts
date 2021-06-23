// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  LogProvider,
  TextInputQuestion,
  TelemetryReporter,
  Inputs,
} from "@microsoft/teamsfx-api";
import { QuestionConstants } from "../constants";
import { NamingRules } from "../utils/namingRules";
import { BaseQuestionService, IQuestionService } from "./question";

export class ApimServiceNameQuestion extends BaseQuestionService implements IQuestionService {
  constructor(telemetryReporter?: TelemetryReporter, logger?: LogProvider) {
    super(telemetryReporter, logger);
  }

  public getQuestion(): TextInputQuestion {
    return {
      type: "text",
      name: QuestionConstants.CLI.ApimServiceName.questionName,
      title: QuestionConstants.CLI.ApimServiceName.description,
      validation: {
        validFunc: (input: string, previousInputs?: Inputs): string | undefined =>
          NamingRules.validate(input as string, NamingRules.apimServiceName),
      },
    };
  }
}

export class ApimResourceGroupQuestion extends BaseQuestionService implements IQuestionService {
  constructor(telemetryReporter?: TelemetryReporter, logger?: LogProvider) {
    super(telemetryReporter, logger);
  }

  public getQuestion(): TextInputQuestion {
    return {
      type: "text",
      name: QuestionConstants.CLI.ApimResourceGroup.questionName,
      title: QuestionConstants.CLI.ApimResourceGroup.description,
      validation: {
        validFunc: (input: string, previousInputs?: Inputs): string | undefined =>
          NamingRules.validate(input as string, NamingRules.resourceGroupName),
      },
    };
  }
}

export class OpenApiDocumentQuestion extends BaseQuestionService implements IQuestionService {
  constructor(telemetryReporter?: TelemetryReporter, logger?: LogProvider) {
    super(telemetryReporter, logger);
  }

  public getQuestion(): TextInputQuestion {
    return {
      type: "text",
      name: QuestionConstants.CLI.OpenApiDocument.questionName,
      title: QuestionConstants.CLI.OpenApiDocument.description,
      // TODO: Validate OpenAPI document after CLI support remote validation func
    };
  }
}

export class ApiPrefixQuestion extends BaseQuestionService implements IQuestionService {
  constructor(telemetryReporter?: TelemetryReporter, logger?: LogProvider) {
    super(telemetryReporter, logger);
  }

  public getQuestion(): TextInputQuestion {
    return {
      type: "text",
      name: QuestionConstants.CLI.ApiPrefix.questionName,
      title: QuestionConstants.CLI.ApiPrefix.description,
      // TODO: Validate API prefix after CLI support remote validation func
      validation: {
        validFunc: (input: string, previousInputs?: Inputs): string | undefined =>
          NamingRules.validate(input as string, NamingRules.apiPrefix),
      },
    };
  }
}

// TODO: Enable Api Id question after enable validation
export class ApiIdQuestion extends BaseQuestionService implements IQuestionService {
  constructor(telemetryReporter?: TelemetryReporter, logger?: LogProvider) {
    super(telemetryReporter, logger);
  }

  public getQuestion(): TextInputQuestion {
    return {
      type: "text",
      name: QuestionConstants.CLI.ApiId.questionName,
      title: QuestionConstants.CLI.ApiId.description,
      // TODO: Validate API id after CLI support remote validation func
      validation: {
        validFunc: (input: string, previousInputs?: Inputs): string | undefined =>
          NamingRules.validate(input as string, NamingRules.apiId),
      },
    };
  }
}

export class ApiVersionQuestion extends BaseQuestionService implements IQuestionService {
  constructor(telemetryReporter?: TelemetryReporter, logger?: LogProvider) {
    super(telemetryReporter, logger);
  }

  public getQuestion(): TextInputQuestion {
    return {
      type: "text",
      name: QuestionConstants.CLI.ApiVersion.questionName,
      title: QuestionConstants.CLI.ApiVersion.description,
      validation: {
        validFunc: (input: string, previousInputs?: Inputs): string | undefined =>
          NamingRules.validate(input as string, NamingRules.versionIdentity),
        required: true,
      },
    };
  }
}
