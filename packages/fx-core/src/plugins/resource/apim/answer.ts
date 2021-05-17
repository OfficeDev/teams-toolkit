// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { ApiContract } from "@azure/arm-apimanagement/src/models";
import { ConfigMap, Platform, PluginContext, Stage } from "@microsoft/teamsfx-api";
import { OpenAPI } from "openapi-types";
import { QuestionConstants, ValidationConstants } from "./constants";
import { AssertNotEmpty, BuildError, InvalidCliOptionError, NotImplemented } from "./error";
import { IApimPluginConfig } from "./config";
import { IOpenApiDocument } from "./interfaces/IOpenApiDocument";
import { IApimServiceResource } from "./interfaces/IApimResource";
import { NamingRules } from "./utils/namingRules";
import { OpenApiProcessor } from "./utils/openApiProcessor";

export interface IAnswer {
  resourceGroupName: string | undefined;
  apimServiceName: string | undefined;
  apiDocumentPath: string | undefined;
  apiPrefix: string | undefined;
  apiId: string | undefined;
  versionIdentity: string | undefined;
  openApiDocumentSpec?: OpenAPI.Document;
  save(stage: Stage, apimConfig: IApimPluginConfig): void;
  validate?(stage: Stage, apimConfig: IApimPluginConfig, projectRootDir: string): Promise<void>;
}

export function buildAnswer(ctx: PluginContext): IAnswer {
  const answers = AssertNotEmpty("ctx.answers", ctx.answers);
  switch (ctx.platform) {
    case Platform.VSCode:
      return new VSCodeAnswer(answers);
    case Platform.CLI:
      return new CLIAnswer(answers);
    default:
      throw BuildError(NotImplemented);
  }
}

export class VSCodeAnswer implements IAnswer {
  private answer: ConfigMap;
  constructor(answer: ConfigMap) {
    this.answer = answer;
  }
  get resourceGroupName(): string | undefined {
    const apimService = this.answer?.getOptionItem(QuestionConstants.VSCode.Apim.questionName)
      ?.data as IApimServiceResource;
    return apimService?.resourceGroupName;
  }
  get apimServiceName(): string | undefined {
    const apimService = this.answer?.getOptionItem(QuestionConstants.VSCode.Apim.questionName)
      ?.data as IApimServiceResource;
    return apimService?.serviceName;
  }
  get apiDocumentPath(): string | undefined {
    return this.answer?.getOptionItem(QuestionConstants.VSCode.OpenApiDocument.questionName)?.label;
  }
  get openApiDocumentSpec(): OpenAPI.Document | undefined {
    const openApiDocument = this.answer?.getOptionItem(
      QuestionConstants.VSCode.OpenApiDocument.questionName
    )?.data as IOpenApiDocument;
    return openApiDocument?.spec as OpenAPI.Document;
  }
  get apiPrefix(): string | undefined {
    return this.answer?.getString(QuestionConstants.VSCode.ApiPrefix.questionName);
  }
  get apiId(): string | undefined {
    const api = this.answer?.getOptionItem(QuestionConstants.VSCode.ApiVersion.questionName)
      ?.data as ApiContract;
    return api?.name;
  }
  get versionIdentity(): string | undefined {
    const api = this.answer?.getOptionItem(QuestionConstants.VSCode.ApiVersion.questionName)
      ?.data as ApiContract;
    return (
      api?.apiVersion ?? this.answer?.getString(QuestionConstants.VSCode.NewApiVersion.questionName)
    );
  }

  save(stage: Stage, apimConfig: IApimPluginConfig): void {
    switch (stage) {
      case Stage.update:
        apimConfig.resourceGroupName = this.resourceGroupName ?? apimConfig.resourceGroupName;
        apimConfig.serviceName = this.apimServiceName ?? apimConfig.serviceName;
        break;
      case Stage.deploy:
        apimConfig.apiDocumentPath = this.apiDocumentPath ?? apimConfig.apiDocumentPath;
        apimConfig.apiPrefix = this.apiPrefix ?? apimConfig.apiPrefix;
        break;
    }
  }
}

export class CLIAnswer implements IAnswer {
  private answer: ConfigMap;
  constructor(answer: ConfigMap) {
    this.answer = answer;
  }

  get resourceGroupName(): string | undefined {
    return this.answer?.getString(QuestionConstants.CLI.ApimResourceGroup.questionName);
  }
  get apimServiceName(): string | undefined {
    return this.answer?.getString(QuestionConstants.CLI.ApimServiceName.questionName);
  }
  get apiDocumentPath(): string | undefined {
    return this.answer?.getString(QuestionConstants.CLI.OpenApiDocument.questionName);
  }
  get apiPrefix(): string | undefined {
    return this.answer?.getString(QuestionConstants.CLI.ApiPrefix.questionName);
  }
  get apiId(): string | undefined {
    return this.answer?.getString(QuestionConstants.CLI.ApiId.questionName);
  }
  get versionIdentity(): string | undefined {
    return this.answer?.getString(QuestionConstants.CLI.ApiVersion.questionName);
  }

  save(stage: Stage, apimConfig: IApimPluginConfig): void {
    switch (stage) {
      case Stage.update:
        apimConfig.resourceGroupName = this.resourceGroupName ?? apimConfig.resourceGroupName;
        apimConfig.serviceName = this.apimServiceName ?? apimConfig.serviceName;
        break;
      case Stage.deploy:
        apimConfig.apiDocumentPath = this.apiDocumentPath ?? apimConfig.apiDocumentPath;
        apimConfig.apiPrefix = this.apiPrefix ?? apimConfig.apiPrefix;
        break;
    }
  }

  async validate(
    stage: Stage,
    apimConfig: IApimPluginConfig,
    projectRootDir: string
  ): Promise<void> {
    const message = await this.validateWithMessage(stage, apimConfig, projectRootDir);
    if (typeof message !== "undefined") {
      throw BuildError(InvalidCliOptionError, message);
    }
  }

  // TODO: delete the following logic after cli question model fix undefined / empty string validation bug
  // https://msazure.visualstudio.com/Microsoft%20Teams%20Extensibility/_workitems/edit/9893622
  // https://msazure.visualstudio.com/Microsoft%20Teams%20Extensibility/_workitems/edit/9823734
  private async validateWithMessage(
    stage: Stage,
    apimConfig: IApimPluginConfig,
    projectRootDir: string
  ): Promise<string | undefined> {
    switch (stage) {
      case Stage.update:
        // Validate the option format
        if (typeof this.resourceGroupName !== "undefined") {
          const message = NamingRules.validate(
            this.resourceGroupName,
            NamingRules.resourceGroupName
          );
          if (message) {
            return `${ValidationConstants.CLI.invalidOptionMessage(
              QuestionConstants.CLI.ApimResourceGroup.questionName
            )} ${message}`;
          }
        }

        if (typeof this.apimServiceName !== "undefined") {
          const message = NamingRules.validate(this.apimServiceName, NamingRules.apimServiceName);
          if (message) {
            return `${ValidationConstants.CLI.invalidOptionMessage(
              QuestionConstants.CLI.ApimServiceName.questionName
            )} ${message}`;
          }
        }
        break;
      case Stage.deploy:
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
          } catch (error) {
            return `${ValidationConstants.CLI.invalidOptionMessage(
              QuestionConstants.CLI.OpenApiDocument.questionName
            )} ${error.message}`;
          }
        }

        if (typeof this.versionIdentity != "undefined") {
          const message = NamingRules.validate(this.versionIdentity, NamingRules.versionIdentity);
          if (message) {
            return `${ValidationConstants.CLI.invalidOptionMessage(
              QuestionConstants.CLI.OpenApiDocument.questionName
            )} ${message}`;
          }
        }

        break;
    }

    return undefined;
  }
}
