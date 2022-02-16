// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { ApiContract } from "@azure/arm-apimanagement/src/models";
import { Inputs, OptionItem, Platform } from "@microsoft/teamsfx-api";
import { OpenAPI } from "openapi-types";
import { PluginLifeCycle, QuestionConstants, ValidationConstants } from "./constants";
import { AssertNotEmpty, BuildError, InvalidCliOptionError, NotImplemented } from "./error";
import { IApimPluginConfig } from "./config";
import { IOpenApiDocument } from "./interfaces/IOpenApiDocument";
import { NamingRules } from "./utils/namingRules";
import { OpenApiProcessor } from "./utils/openApiProcessor";

export interface IAnswer {
  apiDocumentPath: string | undefined;
  apiPrefix: string | undefined;
  apiId: string | undefined;
  versionIdentity: string | undefined;
  openApiDocumentSpec?: OpenAPI.Document | undefined;
  save(lifecycle: PluginLifeCycle, apimConfig: IApimPluginConfig): void;
  validate?(
    lifecycle: PluginLifeCycle,
    apimConfig: IApimPluginConfig,
    projectRootDir: string
  ): Promise<void>;
}

export function buildAnswer(inputs: Inputs | undefined): IAnswer {
  inputs = AssertNotEmpty("inputs", inputs);
  switch (inputs.platform) {
    case Platform.VSCode:
      return new VSCodeAnswer(inputs);
    case Platform.CLI:
      return new CLIAnswer(inputs);
    default:
      throw BuildError(NotImplemented);
  }
}

class BaseAnswer {
  protected inputs: Inputs;
  constructor(inputs: Inputs) {
    this.inputs = inputs;
  }

  protected getOptionItem(questionName: string): OptionItem {
    return this.inputs[questionName] as OptionItem;
  }

  protected getString(questionName: string): string {
    return this.inputs[questionName] as string;
  }
}

export class VSCodeAnswer extends BaseAnswer implements IAnswer {
  constructor(inputs: Inputs) {
    super(inputs);
  }

  get apiDocumentPath(): string | undefined {
    return this.getOptionItem(QuestionConstants.VSCode.OpenApiDocument.questionName)?.label;
  }
  get openApiDocumentSpec(): OpenAPI.Document | undefined {
    const openApiDocument = this.getOptionItem(
      QuestionConstants.VSCode.OpenApiDocument.questionName
    )?.data as IOpenApiDocument;
    return openApiDocument?.spec as OpenAPI.Document;
  }
  get apiPrefix(): string | undefined {
    return this.getString(QuestionConstants.VSCode.ApiPrefix.questionName);
  }
  get apiId(): string | undefined {
    const api = this.getOptionItem(QuestionConstants.VSCode.ApiVersion.questionName)
      ?.data as ApiContract;
    return api?.name;
  }
  get versionIdentity(): string | undefined {
    const api = this.getOptionItem(QuestionConstants.VSCode.ApiVersion.questionName)
      ?.data as ApiContract;
    return api?.apiVersion ?? this.getString(QuestionConstants.VSCode.NewApiVersion.questionName);
  }

  save(lifecycle: PluginLifeCycle, apimConfig: IApimPluginConfig): void {
    switch (lifecycle) {
      case PluginLifeCycle.Deploy:
        apimConfig.apiDocumentPath = this.apiDocumentPath ?? apimConfig.apiDocumentPath;
        apimConfig.apiPrefix = this.apiPrefix ?? apimConfig.apiPrefix;
        break;
    }
  }
}

export class CLIAnswer extends BaseAnswer implements IAnswer {
  constructor(inputs: Inputs) {
    super(inputs);
  }

  get apiDocumentPath(): string | undefined {
    return this.getString(QuestionConstants.CLI.OpenApiDocument.questionName);
  }
  get apiPrefix(): string | undefined {
    return this.getString(QuestionConstants.CLI.ApiPrefix.questionName);
  }
  get apiId(): string | undefined {
    return this.getString(QuestionConstants.CLI.ApiId.questionName);
  }
  get versionIdentity(): string | undefined {
    return this.getString(QuestionConstants.CLI.ApiVersion.questionName);
  }

  save(lifecycle: PluginLifeCycle, apimConfig: IApimPluginConfig): void {
    switch (lifecycle) {
      case PluginLifeCycle.Deploy:
        apimConfig.apiDocumentPath = this.apiDocumentPath ?? apimConfig.apiDocumentPath;
        apimConfig.apiPrefix = this.apiPrefix ?? apimConfig.apiPrefix;
        break;
    }
  }

  async validate(
    lifecycle: PluginLifeCycle,
    apimConfig: IApimPluginConfig,
    projectRootDir: string
  ): Promise<void> {
    const message = await this.validateWithMessage(lifecycle, apimConfig, projectRootDir);
    if (typeof message !== "undefined") {
      throw BuildError(InvalidCliOptionError, message);
    }
  }

  // TODO: delete the following logic after cli question model fix undefined / empty string validation bug
  // https://msazure.visualstudio.com/Microsoft%20Teams%20Extensibility/_workitems/edit/9893622
  // https://msazure.visualstudio.com/Microsoft%20Teams%20Extensibility/_workitems/edit/9823734
  private async validateWithMessage(
    lifecycle: PluginLifeCycle,
    apimConfig: IApimPluginConfig,
    projectRootDir: string
  ): Promise<string | undefined> {
    switch (lifecycle) {
      case PluginLifeCycle.Deploy:
        // Validate the option requirements
        if (!apimConfig.apiPrefix && !this.apiPrefix) {
          return ValidationConstants.CLI.emptyOptionMessage(
            QuestionConstants.CLI.ApiPrefix.questionName
          );
        }

        if (!apimConfig.apiDocumentPath && !this.apiDocumentPath) {
          return ValidationConstants.CLI.emptyOptionMessage(
            QuestionConstants.CLI.OpenApiDocument.questionName
          );
        }

        if (!this.versionIdentity) {
          return ValidationConstants.CLI.emptyOptionMessage(
            QuestionConstants.CLI.ApiVersion.questionName
          );
        }

        // Validate the option override
        if (apimConfig.apiPrefix && this.apiPrefix) {
          return ValidationConstants.CLI.overrideOptionMessage(
            QuestionConstants.CLI.ApiPrefix.questionName
          );
        }

        // Validate the option format
        if (typeof this.apiPrefix !== "undefined") {
          const message = NamingRules.validate(this.apiPrefix, NamingRules.apiPrefix);
          if (message) {
            return `${ValidationConstants.CLI.invalidOptionMessage(
              QuestionConstants.CLI.ApiPrefix.questionName
            )} ${message}`;
          }
        }

        if (typeof this.apiDocumentPath !== "undefined") {
          try {
            const openApiProcessor = new OpenApiProcessor();
            await openApiProcessor.loadOpenApiDocument(this.apiDocumentPath, projectRootDir);
          } catch (error: any) {
            return `${ValidationConstants.CLI.invalidOptionMessage(
              QuestionConstants.CLI.OpenApiDocument.questionName
            )} ${error.message}`;
          }
        }

        if (typeof this.versionIdentity != "undefined") {
          const message = NamingRules.validate(this.versionIdentity, NamingRules.versionIdentity);
          if (message) {
            return `${ValidationConstants.CLI.invalidOptionMessage(
              QuestionConstants.CLI.ApiVersion.questionName
            )} ${message}`;
          }
        }

        break;
    }

    return undefined;
  }
}
