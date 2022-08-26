// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { EnvInfo, Func, PluginContext, QTreeNode, v3 } from "@microsoft/teamsfx-api";
import { APIM_STATE_KEY } from "../../../../component/migrate";
import { BuiltInFeaturePluginNames } from "../../../../plugins/solution/fx-solution/v3/constants";
import { IApimPluginConfig } from "../config";
import { BuildError, NotImplemented } from "../error";
import * as CLI from "../questions/cliQuestion";
import * as VSCode from "../questions/vscodeQuestion";
export interface IQuestionManager {
  callFunc(func: Func, ctx: PluginContext): Promise<any>;
  deploy(
    projectPath?: string,
    envInfo?: EnvInfo | v3.EnvInfoV3,
    apimConfig?: IApimPluginConfig
  ): Promise<QTreeNode>;
}
export class VscQuestionManager implements IQuestionManager {
  private readonly openApiDocumentQuestion: VSCode.OpenApiDocumentQuestion;
  private readonly existingOpenApiDocumentFunc: VSCode.ExistingOpenApiDocumentFunc;
  private readonly apiPrefixQuestion: VSCode.ApiPrefixQuestion;
  private readonly apiVersionQuestion: VSCode.ApiVersionQuestion;
  private readonly newApiVersionQuestion: VSCode.NewApiVersionQuestion;

  constructor(
    openApiDocumentQuestion: VSCode.OpenApiDocumentQuestion,
    apiPrefixQuestion: VSCode.ApiPrefixQuestion,
    apiVersionQuestion: VSCode.ApiVersionQuestion,
    newApiVersionQuestion: VSCode.NewApiVersionQuestion,
    existingOpenApiDocumentFunc: VSCode.ExistingOpenApiDocumentFunc
  ) {
    this.openApiDocumentQuestion = openApiDocumentQuestion;
    this.apiPrefixQuestion = apiPrefixQuestion;
    this.apiVersionQuestion = apiVersionQuestion;
    this.newApiVersionQuestion = newApiVersionQuestion;
    this.existingOpenApiDocumentFunc = existingOpenApiDocumentFunc;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  async callFunc(func: Func, ctx: PluginContext): Promise<any> {
    throw BuildError(NotImplemented);
  }

  async deploy(
    projectPath?: string,
    envInfo?: EnvInfo | v3.EnvInfoV3,
    apimConfig?: IApimPluginConfig
  ): Promise<QTreeNode> {
    const rootNode = new QTreeNode({
      type: "group",
    });

    let documentNode: QTreeNode;
    if (!apimConfig!.apiDocumentPath) {
      const documentPathQuestion = this.openApiDocumentQuestion.getQuestion(projectPath!);
      documentNode = new QTreeNode(documentPathQuestion);
    } else {
      const apimState = envInfo!.state.get
        ? (envInfo!.state as Map<string, any>).get(BuiltInFeaturePluginNames.apim)
        : (envInfo!.state as v3.ResourceStates)[APIM_STATE_KEY];
      const documentPathFunc = this.existingOpenApiDocumentFunc.getQuestion(
        projectPath!,
        envInfo!.envName,
        apimState
      );
      documentNode = new QTreeNode(documentPathFunc);
    }

    rootNode.addChild(documentNode);

    if (!apimConfig!.apiPrefix) {
      const apiPrefixQuestion = this.apiPrefixQuestion.getQuestion();
      const apiPrefixQuestionNode = new QTreeNode(apiPrefixQuestion);
      documentNode.addChild(apiPrefixQuestionNode);
    }

    const versionQuestion = this.apiVersionQuestion.getQuestion(envInfo!);
    const versionQuestionNode = new QTreeNode(versionQuestion);
    documentNode.addChild(versionQuestionNode);

    const newVersionQuestion = this.newApiVersionQuestion.getQuestion();
    const newVersionQuestionNode = new QTreeNode(newVersionQuestion);
    newVersionQuestionNode.condition = this.newApiVersionQuestion.condition();
    versionQuestionNode.addChild(newVersionQuestionNode);

    return rootNode;
  }
}

export class CliQuestionManager implements IQuestionManager {
  private readonly openApiDocumentQuestion: CLI.OpenApiDocumentQuestion;
  private readonly apiPrefixQuestion: CLI.ApiPrefixQuestion;
  private readonly apiVersionQuestion: CLI.ApiVersionQuestion;
  constructor(
    openApiDocumentQuestion: CLI.OpenApiDocumentQuestion,
    apiPrefixQuestion: CLI.ApiPrefixQuestion,
    apiVersionQuestion: CLI.ApiVersionQuestion
  ) {
    this.openApiDocumentQuestion = openApiDocumentQuestion;
    this.apiPrefixQuestion = apiPrefixQuestion;
    this.apiVersionQuestion = apiVersionQuestion;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  async callFunc(func: Func, ctx: PluginContext): Promise<any> {
    throw BuildError(NotImplemented);
  }

  async deploy(
    projectPath?: string,
    envInfo?: EnvInfo | v3.EnvInfoV3,
    apimConfig?: IApimPluginConfig
  ): Promise<QTreeNode> {
    const rootNode = new QTreeNode({
      type: "group",
    });

    if (!apimConfig?.apiDocumentPath) {
      const openApiDocumentQuestion = this.openApiDocumentQuestion.getQuestion();
      rootNode.addChild(new QTreeNode(openApiDocumentQuestion));
    }

    if (!apimConfig?.apiPrefix) {
      const apiPrefixQuestion = this.apiPrefixQuestion.getQuestion();
      rootNode.addChild(new QTreeNode(apiPrefixQuestion));
    }

    const apiVersionQuestion = this.apiVersionQuestion.getQuestion();
    rootNode.addChild(new QTreeNode(apiVersionQuestion));
    return rootNode;
  }
}
