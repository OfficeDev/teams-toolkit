// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
    LogProvider,
    NodeType,
    TextInputQuestion,
    TelemetryReporter,
} from "@microsoft/teamsfx-api";
import { QuestionConstants } from "../constants";
import { NamingRules } from "../util/namingRules";
import { BaseQuestionService, IQuestionService } from "./question";


export class ApimServiceNameQuestion extends BaseQuestionService implements IQuestionService {
    constructor(telemetryReporter?: TelemetryReporter, logger?: LogProvider) {
        super(telemetryReporter, logger);
    }

    public getQuestion(): TextInputQuestion {
        return {
            type: NodeType.text,
            name: QuestionConstants.CLI.ApimServiceName.questionName,
            description: QuestionConstants.CLI.ApimServiceName.description,
            validation: {
                validFunc: (input: string|string[]|undefined): string | undefined => NamingRules.validate(input, NamingRules.apimServiceName)
            }
        };
    }
}

export class ApimResourceGroupQuestion extends BaseQuestionService implements IQuestionService {
    constructor(telemetryReporter?: TelemetryReporter, logger?: LogProvider) {
        super(telemetryReporter, logger);
    }

    public getQuestion(): TextInputQuestion {
        return {
            type: NodeType.text,
            name: QuestionConstants.CLI.ApimResourceGroup.questionName,
            description: QuestionConstants.CLI.ApimResourceGroup.description,
            validation: {
                validFunc: (input: string|string[]|undefined): string | undefined => NamingRules.validate(input, NamingRules.resourceGroupName)
            }
        };
    }
}

export class OpenApiDocumentQuestion extends BaseQuestionService implements IQuestionService {
    constructor(telemetryReporter?: TelemetryReporter, logger?: LogProvider) {
        super(telemetryReporter, logger);
    }

    public getQuestion(): TextInputQuestion {
        return {
            type: NodeType.text,
            name: QuestionConstants.CLI.OpenApiDocument.questionName,
            description: QuestionConstants.CLI.OpenApiDocument.description,
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
            type: NodeType.text,
            name: QuestionConstants.CLI.ApiPrefix.questionName,
            description: QuestionConstants.CLI.ApiPrefix.description,
            // TODO: Validate API prefix after CLI support remote validation func
            validation: {
                validFunc: (input: string|string[]|undefined): string | undefined => NamingRules.validate(input, NamingRules.apiPrefix)
            }
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
            type: NodeType.text,
            name: QuestionConstants.CLI.ApiId.questionName,
            description: QuestionConstants.CLI.ApiId.description,
            // TODO: Validate API id after CLI support remote validation func
            validation: {
                validFunc: (input: string|string[]|undefined): string | undefined => NamingRules.validate(input, NamingRules.apiId)
            }
        };
    }
}

export class ApiVersionQuestion extends BaseQuestionService implements IQuestionService {
    constructor(telemetryReporter?: TelemetryReporter, logger?: LogProvider) {
        super(telemetryReporter, logger);
    }

    public getQuestion(): TextInputQuestion {
        return {
            type: NodeType.text,
            name: QuestionConstants.CLI.ApiVersion.questionName,
            description: QuestionConstants.CLI.ApiVersion.description,
            validation: {
                validFunc: (input: string|string[]|undefined): string | undefined => NamingRules.validate(input, NamingRules.versionIdentity),
                required: true
            }
        };
    }
}