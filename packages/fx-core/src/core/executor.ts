// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import {
    ConfigMap,
    err,
    Func,
    FxError,
    NodeType,
    ok,
    QTreeNode,
    Result,
    Stage,
    returnUserError,
    UserError,
    SingleSelectQuestion,
    StringValidation,
    ConfigFolderName,
} from "fx-api";
import * as path from "path";
import {hooks} from "@feathersjs/hooks";
import * as fs from "fs-extra";
import * as jsonschema from "jsonschema";

import * as error from "./error";
import {
    CoreQuestionNames,
    QuestionAppName,
    QuestionRootFolder,
    QuestionSelectSolution,
} from "./question";
import {CoreContext} from "./context";
import {readConfigMW, writeConfigMW} from "./middlewares/config";
import {validationMW} from "./middlewares/validation";
import {envMW} from "./middlewares/env";
import {solutionMW} from "./middlewares/solution";
import {LaunchConfig} from "./launch";

export class Executor {

    @hooks([validationMW, envMW, solutionMW, readConfigMW, writeConfigMW])
    static async localDebug(
        ctx: CoreContext,
        answers?: ConfigMap
    ): Promise<Result<null, FxError>> {
        return ctx.selectedSolution!.localDebug(ctx.toSolutionContext(answers));
    }

    @hooks([validationMW, envMW, solutionMW, readConfigMW])
    static async getQuestions(
        ctx: CoreContext
    ): Promise<Result<QTreeNode | undefined, FxError>> {
        const answers = new ConfigMap();
        answers.set("stage", ctx.stage);
        answers.set("substage", "getQuestions");
        const node = new QTreeNode({type: NodeType.group});
        if (ctx.stage === Stage.create) {
            node.addChild(new QTreeNode(QuestionAppName));

            //make sure that global solutions are loaded
            const solutionNames: string[] = [];
            for (const k of ctx.globalSolutions.keys()) {
                solutionNames.push(k);
            }
            const selectSolution: SingleSelectQuestion = QuestionSelectSolution;
            selectSolution.option = solutionNames;
            const select_solution = new QTreeNode(selectSolution);
            node.addChild(select_solution);

            for (const [k, v] of ctx.globalSolutions) {
                if (v.getQuestions) {
                    const res = await v.getQuestions(ctx.stage, ctx.toSolutionContext(answers));
                    if (res.isErr()) return res;
                    if (res.value) {
                        const solutionNode = res.value as QTreeNode;
                        solutionNode.condition = {equals: k};
                        if (solutionNode.data) select_solution.addChild(solutionNode);
                    }
                }
            }
            node.addChild(new QTreeNode(QuestionRootFolder));
        } else if (ctx.selectedSolution) {
            const res = await ctx.selectedSolution.getQuestions(ctx.stage, ctx.toSolutionContext(answers));
            if (res.isErr()) return res;
            if (res.value) {
                const child = res.value as QTreeNode;
                if (child.data) node.addChild(child);
            }
        }
        return ok(node);
    }

    @hooks([validationMW, envMW, solutionMW, readConfigMW])
    static async getQuestionsForUserTask(
        ctx: CoreContext,
        func: Func
    ): Promise<Result<QTreeNode | undefined, FxError>> {
        const namespace = func.namespace;
        const array = namespace ? namespace.split("/") : [];
        if (namespace && "" !== namespace && array.length > 0) {
            const solutionName = array[0];
            const solution = ctx.globalSolutions.get(solutionName);
            if (solution && solution.getQuestionsForUserTask) {
                return await solution.getQuestionsForUserTask(func, ctx.toSolutionContext());
            }
        }
        return err(
            returnUserError(
                new Error(`getQuestionsForUserTaskRouteFailed:${JSON.stringify(func)}`),
                error.CoreSource,
                error.CoreErrorNames.getQuestionsForUserTaskRouteFailed,
            ),
        );
    }

    @hooks([validationMW, envMW, solutionMW, readConfigMW, writeConfigMW])
    static async executeUserTask(
        ctx: CoreContext,
        func: Func,
        answer?: ConfigMap
    ): Promise<Result<any, FxError>> {

        const namespace = func.namespace;
        const array = namespace ? namespace.split("/") : [];
        if ("" !== namespace && array.length > 0) {
            const solutionName = array[0];
            const solution = ctx.globalSolutions.get(solutionName);
            if (solution && solution.executeUserTask) {
                return await solution.executeUserTask(func, ctx.toSolutionContext(answer));
            }
        }
        return err(
            returnUserError(
                new Error(`executeUserTaskRouteFailed:${JSON.stringify(func)}`),
                error.CoreSource,
                error.CoreErrorNames.executeUserTaskRouteFailed,
            ),
        );
    }

    private static async validateFolder(
        folder: string,
        answer?: ConfigMap
    ): Promise<Result<any, FxError>> {
        const appName = answer?.getString(CoreQuestionNames.AppName);
        if (!appName) return ok(undefined);
        const projectPath = path.resolve(folder, appName);
        const exists = await fs.pathExists(projectPath);
        if (exists) return ok(`Project folder already exists:${projectPath}, please change a different folder.`);
        return ok(undefined);
    }

    @hooks([validationMW, envMW, solutionMW, readConfigMW, writeConfigMW])
    static async callFunc(
        ctx: CoreContext,
        func: Func,
        answer?: ConfigMap
    ): Promise<Result<any, FxError>> {
        const namespace = func.namespace;
        const array = namespace ? namespace.split("/") : [];
        if (!namespace || "" === namespace || array.length === 0) {
            if (func.method === "validateFolder") {
                if (!func.params) return ok(undefined);
                return await this.validateFolder(func.params as string, answer);
            }
        } else {
            const solutionName = array[0];
            const solution = ctx.globalSolutions.get(solutionName);
            if (solution && solution.callFunc) {
                return await solution.callFunc(func, ctx.toSolutionContext(answer));
            }
        }
        return err(
            returnUserError(
                new Error(`CallFuncRouteFailed:${JSON.stringify(func)}`),
                error.CoreSource,
                error.CoreErrorNames.CallFuncRouteFailed,
            ),
        );
    }

    @hooks([solutionMW, writeConfigMW])
    static async create(
        ctx: CoreContext,
        answers?: ConfigMap
    ): Promise<Result<string, FxError>> {
        if (!ctx.dialog) {
            return err(error.InvalidContext());
        }
        ctx.logProvider?.info(`[Core] create - create target object`);

        const appName = answers?.getString(QuestionAppName.name);
        const validateResult = jsonschema.validate(appName, {
            pattern: (QuestionAppName.validation as StringValidation).pattern,
        });
        if (!appName || validateResult.errors && validateResult.errors.length > 0) {
            return err(
                new UserError(
                    error.CoreErrorNames.InvalidInput,
                    `${validateResult.errors[0].message}`,
                    error.CoreSource,
                ),
            );
        }
        const folder = answers?.getString(QuestionRootFolder.name);

        const projFolder = path.resolve(`${folder}/${appName}`);
        const folderExist = await fs.pathExists(projFolder);
        if (folderExist) {
            return err(
                new UserError(
                    error.CoreErrorNames.ProjectFolderExist,
                    `Project folder exsits:${projFolder}`,
                    error.CoreSource
                )
            );
        }
        ctx.root = projFolder;

        const solutionName = answers?.getString(QuestionSelectSolution.name);
        ctx.logProvider?.info(`[Core] create - select solution`);
        for (const s of ctx.globalSolutions.values()) {
            if (s.name === solutionName) {
                ctx.selectedSolution = s;
                break;
            }
        }

        if (!ctx.selectedSolution) {
            return err(
                new UserError(
                    error.CoreErrorNames.InvalidInput,
                    `Solution is not selected!`,
                    error.CoreSource,
                ),
            );
        }

        ctx.projectSettings = {
            appName: appName!,
            solutionSettings: {
                name: ctx.selectedSolution!.name,
                version: ctx.selectedSolution!.version,
            },
        };

        const targetFolder = path.resolve(ctx.root);

        await fs.ensureDir(targetFolder);
        await fs.ensureDir(`${targetFolder}/.${ConfigFolderName}`);

        ctx.logProvider?.info(`[Core] create - call solution.create()`);
        const result = await ctx.selectedSolution!.create(
            ctx.toSolutionContext(answers)
        );
        if (result.isErr()) {
            ctx.logProvider?.info(`[Core] create - call solution.create() failed!`);
            return result;
        }
        ctx.logProvider?.info(`[Core] create - call solution.create() success!`);

        try {
            await fs.writeFile(
                `${ctx.root}/package.json`,
                JSON.stringify(
                    {
                        name: appName,
                        version: "0.0.1",
                        description: "",
                        author: "",
                        scripts: {
                            test: "echo \"Error: no test specified\" && exit 1",
                        },
                        license: "MIT",
                    },
                    null,
                    4
                )
            );

            await fs.writeFile(
                `${ctx.root}/.gitignore`,
                `node_modules
.${ConfigFolderName}/*.env
.${ConfigFolderName}/*.userdata
.DS_Store
`
            );

            // write launch.json
            const launch: LaunchConfig = {
                currentEnv: ctx.env,
            };
            await fs.writeFile(
                `${ctx.root}/.${ConfigFolderName}/launch.json`,
                JSON.stringify(launch, null, 4)
            );
        } catch (e) {
            return err(error.WriteFileError(e));
        }

        ctx.logProvider?.info(`[Core] create - create basic folder with configs`);

        return ok(projFolder);
    }

    @hooks([solutionMW, readConfigMW, writeConfigMW])
    static async scaffold(
        ctx: CoreContext,
        answers?: ConfigMap
    ): Promise<Result<null, FxError>> {
        return await ctx.selectedSolution!.scaffold(ctx.toSolutionContext(answers));
    }

    @hooks([validationMW, envMW, solutionMW, readConfigMW, writeConfigMW])
    static async update(
        ctx: CoreContext,
        answers?: ConfigMap
    ): Promise<Result<null, FxError>> {
        return ctx.selectedSolution!.update(ctx.toSolutionContext(answers));
    }

    @hooks([validationMW, envMW, solutionMW, readConfigMW, writeConfigMW])
    static async provision(
        ctx: CoreContext,
        answers?: ConfigMap
    ): Promise<Result<null, FxError>> {
        return ctx.selectedSolution!.provision(ctx.toSolutionContext(answers));
    }

    @hooks([validationMW, envMW, solutionMW, readConfigMW, writeConfigMW])
    static async deploy(
        ctx: CoreContext,
        answers?: ConfigMap
    ): Promise<Result<null, FxError>> {
        return ctx.selectedSolution!.deploy(ctx.toSolutionContext(answers));
    }

    @hooks([validationMW, envMW, solutionMW, readConfigMW, writeConfigMW])
    static async publish(
        ctx: CoreContext,
        answers?: ConfigMap
    ): Promise<Result<null, FxError>> {
        return ctx.selectedSolution!.publish(ctx.toSolutionContext(answers));
    }

    @hooks([validationMW, envMW])
    static async createEnv(
        ctx: CoreContext,
        env: string
    ): Promise<Result<null, FxError>> {
        ctx.env = env;
        ctx.config = new Map();
        return ok(null);
    }

    @hooks([validationMW, envMW])
    static async removeEnv(
        ctx: CoreContext,
        env: string
    ): Promise<Result<null, FxError>> {
        return ok(null);
    }

    @hooks([validationMW, envMW])
    static async switchEnv(
        ctx: CoreContext,
        env: string
    ): Promise<Result<null, FxError>> {
        return ok(null);
    }

    @hooks([validationMW, envMW])
    static async listEnvs(ctx: CoreContext): Promise<Result<string[], FxError>> {
        return ok([]);
    }
}
