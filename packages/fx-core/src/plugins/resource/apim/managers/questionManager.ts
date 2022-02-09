// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Func, Json, PluginConfig, PluginContext, QTreeNode } from "@microsoft/teamsfx-api";
import { IApimPluginConfig } from "../config";
import { BuildError, NotImplemented } from "../error";
import * as CLI from "../questions/cliQuestion";
import * as VSCode from "../questions/vscodeQuestion";

export class VscQuestionManager {
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
    projectPath: string,
    envName: string,
    apimState: PluginConfig | Json,
    solutionState: PluginConfig | Json,
    apimConfig: IApimPluginConfig
  ): Promise<QTreeNode> {
    const rootNode = new QTreeNode({
      type: "group",
    });

    let documentNode: QTreeNode;
    if (!apimConfig.apiDocumentPath) {
      const documentPathQuestion = this.openApiDocumentQuestion.getQuestion(projectPath);
      documentNode = new QTreeNode(documentPathQuestion);
    } else {
      const documentPathFunc = this.existingOpenApiDocumentFunc.getQuestion(
        projectPath,
        envName,
        apimState
      );
      documentNode = new QTreeNode(documentPathFunc);
    }

    rootNode.addChild(documentNode);

    if (!apimConfig.apiPrefix) {
      const apiPrefixQuestion = this.apiPrefixQuestion.getQuestion();
      const apiPrefixQuestionNode = new QTreeNode(apiPrefixQuestion);
      documentNode.addChild(apiPrefixQuestionNode);
    }

    const versionQuestion = this.apiVersionQuestion.getQuestion(envName, apimState, solutionState);
    const versionQuestionNode = new QTreeNode(versionQuestion);
    documentNode.addChild(versionQuestionNode);

    const newVersionQuestion = this.newApiVersionQuestion.getQuestion();
    const newVersionQuestionNode = new QTreeNode(newVersionQuestion);
    newVersionQuestionNode.condition = this.newApiVersionQuestion.condition();
    versionQuestionNode.addChild(newVersionQuestionNode);

    return rootNode;
  }
}

export class CliQuestionManager {
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

  async deploy(): Promise<QTreeNode> {
    const rootNode = new QTreeNode({
      type: "group",
    });

    const openApiDocumentQuestion = this.openApiDocumentQuestion.getQuestion();
    rootNode.addChild(new QTreeNode(openApiDocumentQuestion));
    const apiPrefixQuestion = this.apiPrefixQuestion.getQuestion();
    rootNode.addChild(new QTreeNode(apiPrefixQuestion));
    const apiVersionQuestion = this.apiVersionQuestion.getQuestion();
    rootNode.addChild(new QTreeNode(apiVersionQuestion));
    return rootNode;
  }
}
