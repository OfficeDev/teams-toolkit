// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import * as fs from "fs-extra";
import * as os from "os";
import {
    AzureAccountProvider,
    ConfigMap,
    Context,
    Core,
    Dialog,
    DialogMsg,
    DialogType,
    err,
    Func,
    GraphTokenProvider,
    LogProvider,
    NodeType,
    ok,
    Platform,
    QTreeNode,
    QuestionType,
    Result,
    returnSystemError,
    Solution,
    SolutionConfig,
    SolutionContext,
    Stage,
    TeamsAppManifest,
    TelemetryReporter,
    AppStudioTokenProvider,
    TreeProvider,
    TreeCategory,
    TreeItem,
    returnUserError,
    SystemError,
    UserError,
    SingleSelectQuestion,
    StringValidation,
    FxError,
    ConfigFolderName,
    Json,
    Dict,
    AzureSolutionSettings,
    ProjectSettings,
} from "fx-api";
import * as path from "path";
// import * as Bundles from '../resource/bundles.json';
import * as error from "./error";
import { Loader, Meta } from "./loader";
import { deserializeDict, mapToJson, mergeSerectData, objectToConfigMap, objectToMap, serializeDict, sperateSecretData } from "./tools";
import { VscodeManager } from "./vscodeManager";
import { Settings } from "./settings";
import { CoreQuestionNames, QuestionAppName, QuestionRootFolder, QuestionSelectSolution } from "./question";
import * as jsonschema from "jsonschema";
import { FxBotPluginResultFactory } from "../plugins/resource/bot/result";
import { AzureSubscription, getSubscriptionList } from "./loginUtils";

class CoreImpl implements Core {
    private target?: CoreImpl;

    private app: TeamsAppManifest;

    private configs: Map<string, SolutionConfig>;
    private env: string;

    /*
     * Context will hold necessary info for the whole process for developing a Teams APP.
     */
    ctx: Context;

    private globalSolutions: Map<string, Solution & Meta>;
    private globalFxFolder: string;

    private selectedSolution?: Solution & Meta;

    private globalConfig?: ConfigMap;

    /**
     * constructor will be private to make it singleton.
     */
    constructor() {
        this.globalSolutions = new Map();

        this.app = new TeamsAppManifest();
        this.env = "default";
        this.configs = new Map();
        this.configs.set(this.env, new Map());

        this.ctx = {
            root: os.homedir() + "/teams_app/",
        };  
        this.globalFxFolder = os.homedir() + `/.${ConfigFolderName}/`;
    }

    async localDebug(answers?: ConfigMap): Promise<Result<null, FxError>> {
        const result = await this.selectedSolution!.localDebug(this.solutionContext(answers));
        return result;
    }

    /**
     * by huajie
     * @param stage
     */
    async getQuestions(stage: Stage, platform: Platform): Promise<Result<QTreeNode | undefined, FxError>> {
        this.ctx.platform = platform;
        const answers = new ConfigMap();
        answers.set("stage", stage);
        answers.set("substage", "getQuestions");
        const node = new QTreeNode({ type: NodeType.group });
        if (stage === Stage.create) {
            node.addChild(new QTreeNode(QuestionAppName));

            //make sure that global solutions are loaded
            const solutionNames: string[] = [];
            for (const k of this.globalSolutions.keys()) {
                solutionNames.push(k);
            }
            const selectSolution: SingleSelectQuestion = QuestionSelectSolution;
            selectSolution.option = solutionNames;
            const select_solution = new QTreeNode(selectSolution);
            node.addChild(select_solution);

            for (const [k, v] of this.globalSolutions) {
                if (v.getQuestions) {
                    const res = await v.getQuestions(stage, this.solutionContext(answers));
                    if (res.isErr()) return res;
                    if(res.value){
                        const solutionNode = res.value as QTreeNode;
                        solutionNode.condition = { equals: k };
                        if (solutionNode.data) select_solution.addChild(solutionNode);
                    }
                }
            }
            node.addChild(new QTreeNode(QuestionRootFolder));
        } else if (this.selectedSolution) {
            const res = await this.selectedSolution.getQuestions(stage, this.solutionContext(answers));
            if (res.isErr()) return res;
            if(res.value){
                const child = res.value as QTreeNode;
                if (child.data) node.addChild(child);
            }
        }
        return ok(node);
    }

    async getQuestionsForUserTask(func: Func, platform: Platform): Promise<Result<QTreeNode | undefined, FxError>> {
        this.ctx.platform = platform;
        const namespace = func.namespace;
        const array = namespace? namespace.split("/") : [];
        if (namespace && "" !== namespace && array.length > 0) {
            const solutionName = array[0];
            const solution = this.globalSolutions.get(solutionName);
            if (solution && solution.getQuestionsForUserTask) {
                const solutioContext = this.solutionContext();
                return await solution.getQuestionsForUserTask(func, solutioContext);
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
    async executeUserTask(func: Func, answer?: ConfigMap): Promise<Result<QTreeNode | undefined, FxError>> {
        const namespace = func.namespace;
        const array = namespace? namespace.split("/"):[];
        if ("" !== namespace && array.length > 0) {
            const solutionName = array[0];
            const solution = this.globalSolutions.get(solutionName);
            if (solution && solution.executeUserTask) {
                const solutioContext = this.solutionContext(answer);
                return await solution.executeUserTask(func, solutioContext);
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

    async validateFolder(folder: string, answer?: ConfigMap): Promise<Result<any, FxError>> {
        const appName = answer?.getString(CoreQuestionNames.AppName);
        if (!appName) return ok(undefined);
        const projectPath = path.resolve(folder, appName);
        const exists = await fs.pathExists(projectPath);
        if (exists) return ok(`Project folder already exists:${projectPath}, please change a different folder.`);
        return ok(undefined);
    }

    async callFunc(func: Func, answer?: ConfigMap): Promise<Result<any, FxError>> {
        const namespace = func.namespace;
        const array = namespace?namespace.split("/"):[];
        if (!namespace || "" === namespace || array.length === 0) {
            if (func.method === "validateFolder") {
                if (!func.params) return ok(undefined);
                return await this.validateFolder(func.params as string, answer);
            }
        } else {
            const solutionName = array[0];
            const solution = this.globalSolutions.get(solutionName);
            if (solution && solution.callFunc) {
                const solutioContext = this.solutionContext(answer);
                return await solution.callFunc(func, solutioContext);
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

    /**
     * create
     */
    public async create(answers?: ConfigMap): Promise<Result<null, FxError>> {
        if (!this.ctx.dialog) {
            return err(error.InvalidContext());
        }
        this.ctx.logProvider?.info(`[Core] create - create target object`);
        this.target = new CoreImpl();
        this.target.ctx.dialog = this.ctx.dialog;
        this.target.ctx.azureAccountProvider = this.ctx.azureAccountProvider;
        this.target.ctx.graphTokenProvider = this.ctx.graphTokenProvider;
        this.target.ctx.telemetryReporter = this.ctx.telemetryReporter;
        this.target.ctx.logProvider = this.ctx.logProvider;
        this.target.ctx.platform = this.ctx.platform;
        this.target.ctx.answers = answers;

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
                    error.CoreSource,
                ),
            );
        }
        this.target.ctx.root = projFolder;

        const solutionName = answers?.getString(QuestionSelectSolution.name);
        this.ctx.logProvider?.info(`[Core] create - select solution`);
        for (const s of this.globalSolutions.values()) {
            if (s.name === solutionName) {
                this.target.selectedSolution = s;
                break;
            }
        }

        if(!this.target.selectedSolution){
            return err(
                new UserError(
                    error.CoreErrorNames.InvalidInput,
                    `Solution is not selected!`,
                    error.CoreSource,
                ),
            );
        }

        this.target.ctx.projectSettings = {
            appName: appName,
            solutionSettings:{
                name: this.target.selectedSolution.name,
                version: this.target.selectedSolution.version
            }
        };

        const targetFolder = path.resolve(this.target.ctx.root);

        await fs.ensureDir(targetFolder);
        await fs.ensureDir(`${targetFolder}/.${ConfigFolderName}`);

        this.ctx.logProvider?.info(`[Core] create - call solution.create()`);
        const result = await this.target.selectedSolution!.create(this.target.solutionContext(answers));
        if (result.isErr()) {
            this.ctx.logProvider?.info(`[Core] create - call solution.create() failed!`);
            return result;
        }
        this.ctx.logProvider?.info(`[Core] create - call solution.create() success!`);

        const createResult = await this.createBasicFolderStructure(answers);
        if (createResult.isErr()) {
            return createResult;
        }

       
        this.ctx.logProvider?.info(`[Core] create - create basic folder with configs`);

        this.ctx.logProvider?.info(`[Core] scaffold start!`);
        const scaffoldRes = await this.target.scaffold(answers);

        if (scaffoldRes.isErr()) {
            this.ctx.logProvider?.info(`[Core] scaffold failed!`);
            return scaffoldRes;
        }

        await this.target.writeConfigs();

        this.ctx.logProvider?.info(`[Core] scaffold success! open target folder:${targetFolder}`);

        await this.ctx.dialog?.communicate(
            new DialogMsg(DialogType.Ask, {
                type: QuestionType.OpenFolder,
                description: targetFolder,
            }),
        );

        return ok(null);
    }

    public async update(answers?: ConfigMap): Promise<Result<null, FxError>> {
        return await this.selectedSolution!.update(this.solutionContext(answers));
    }

    /**
     * open an existing project
     */
    public async open(workspace?: string): Promise<Result<null, FxError>> {
        let supported = true;
        if (!workspace) {
            supported = false;
        } else {
            this.ctx.root = workspace;
            supported = await this.isSupported();
            if (!supported) {
                this.ctx.logProvider?.warning(`non Teams project:${workspace}`);
            }
        }

        let getSelectSubItem: undefined | ((token: any) => Promise<TreeItem>) = undefined;
        if (this.ctx.treeProvider) {
            getSelectSubItem = async (token: any): Promise<TreeItem> => {
                let selectSubLabel = "";
                const subscriptions = await getSubscriptionList(token);
                const activeSubscriptionId = this.configs.get(this.env!)!.get("solution")?.getString("subscriptionId");
                const activeSubscription = subscriptions.find(
                    (subscription) => subscription.subscriptionId === activeSubscriptionId,
                );
                if (activeSubscriptionId === undefined || activeSubscription === undefined) {
                    selectSubLabel = `${subscriptions.length} subscriptions discovered`;
                } else {
                    selectSubLabel = activeSubscription.displayName;
                }
                return {
                    commandId: "fx-extension.selectSubscription",
                    label: selectSubLabel,
                    callback: selectSubscriptionCallback,
                    parent: "fx-extension.signinAzure",
                };
            };

            const selectSubscriptionCallback = async (): Promise<Result<null, FxError>> => {
                const azureToken = await this.ctx.azureAccountProvider?.getAccountCredentialAsync();
                const subscriptions: AzureSubscription[] = await getSubscriptionList(azureToken!);
                const subscriptionNames: string[] = subscriptions.map((subscription) => subscription.displayName);
                const subscriptionName = (
                    await this.ctx.dialog?.communicate(
                        new DialogMsg(DialogType.Ask, {
                            type: QuestionType.Radio,
                            description: "Please select a subscription",
                            options: subscriptionNames,
                        }),
                    )
                )?.getAnswer();
                if (subscriptionName === undefined || subscriptionName == "unknown") {
                    return err({
                        name: "emptySubscription",
                        message: "No subscription selected",
                        source: __filename,
                        timestamp: new Date(),
                    });
                }

                this.ctx.treeProvider?.refresh([
                    {
                        commandId: "fx-extension.selectSubscription",
                        label: subscriptionName,
                        callback: selectSubscriptionCallback,
                        parent: "fx-extension.signinAzure",
                    },
                ]);

                const subscription = subscriptions.find((subscription) => subscription.displayName === subscriptionName);

                if(subscription){
                    this.readConfigs();
                    this.configs.get(this.env!)!.get("solution")!.set("subscriptionId", subscription!.subscriptionId!);
                    this.writeConfigs();
                }

                return ok(null);
            };

            const signinM365Callback = async (): Promise<Result<null, FxError>> => {
                const token = await this.ctx.appStudioToken?.getJsonObject(false);
                if (token !== undefined) {
                    this.ctx.treeProvider?.refresh([
                        {
                            commandId: "fx-extension.signinM365",
                            label: (token as any).upn ? (token as any).upn : "",
                            callback: signinM365Callback,
                            parent: TreeCategory.Account,
                            contextValue: "signedinM365",
                        },
                    ]);
                }

                return ok(null);
            };

            const signinAzureCallback = async (validFxProject: boolean): Promise<Result<null, FxError>> => {
                const token = await this.ctx.azureAccountProvider?.getAccountCredentialAsync(false);
                if (token !== undefined) {
                    this.ctx.treeProvider?.refresh([
                        {
                            commandId: "fx-extension.signinAzure",
                            label: (token as any).username ? (token as any).username : "",
                            callback: signinAzureCallback,
                            parent: TreeCategory.Account,
                            contextValue: "signedinAzure",
                        },
                    ]);

                    if (validFxProject) {
                        const subItem = await getSelectSubItem!(token);
                        this.ctx.treeProvider?.add([subItem]);
                    }
                }

                return ok(null);
            };

            let azureAccountLabel = "Sign In Azure...";
            let azureAccountContextValue = "signinAzure";
            const token = this.ctx.azureAccountProvider?.getAccountCredential();
            if (token !== undefined) {
                azureAccountLabel = (token as any).username ? (token as any).username : "";
                azureAccountContextValue = "signedinAzure";
            }

            this.ctx.appStudioToken?.setStatusChangeCallback(
                (status: string, token?: string | undefined, accountInfo?: Record<string, unknown> | undefined) => {
                    if (status === "SignedIn") {
                        signinM365Callback();
                    }
                    return Promise.resolve();
                },
            );
            this.ctx.azureAccountProvider?.setStatusChangeCallback(
                async (status: string, token?: string | undefined, accountInfo?: Record<string, unknown> | undefined) => {
                    if (status === "SignedIn") {
                        const token = this.ctx.azureAccountProvider?.getAccountCredential();
                        if (token !== undefined) {
                            this.ctx.treeProvider?.refresh([
                                {
                                    commandId: "fx-extension.signinAzure",
                                    label: (token as any).username ? (token as any).username : "",
                                    callback: signinAzureCallback,
                                    parent: TreeCategory.Account,
                                    contextValue: "signedinAzure",
                                },
                            ]);
                            if (supported) {
                                const subItem = await getSelectSubItem!(token);
                                this.ctx.treeProvider?.add([subItem]);
                            }
                        }
                    }
                    return Promise.resolve();
                },
            );

            this.ctx.treeProvider.add([
                {
                    commandId: "fx-extension.signinM365",
                    label: "Sign In M365...",
                    callback: signinM365Callback,
                    parent: TreeCategory.Account,
                    contextValue: "signinM365",
                    icon: "M365",
                },
                {
                    commandId: "fx-extension.signinAzure",
                    label: azureAccountLabel,
                    callback: async () => {
                        return signinAzureCallback(supported);
                    },
                    parent: TreeCategory.Account,
                    contextValue: azureAccountContextValue,
                    subTreeItems: [],
                    icon: "azure",
                },
            ]);
        }

        if (!supported) return ok(null);

         
        // read configs
        const readRes = await this.readConfigs();
        if (readRes.isErr()) {
            return readRes;
        }

        if (!this.ctx.projectSettings || !this.ctx.projectSettings?.solutionSettings) {
            return err(error.InvalidContext());
        }

        for (const entry of this.globalSolutions.entries()) {
            if (entry[0] === this.ctx.projectSettings.solutionSettings.name) {
                this.selectedSolution = entry[1];
                break;
            }
        }

        if (this.selectedSolution === undefined) {
            return ok(null);
        }

        this.env = "default";

        const token = this.ctx.azureAccountProvider?.getAccountCredential();
        if (token !== undefined && getSelectSubItem !== undefined) {
            const subItem = await getSelectSubItem(token);
            this.ctx.treeProvider?.add([subItem]);
        }

        return await this.selectedSolution.open(this.solutionContext());
    }

    public async isSupported(workspace?: string): Promise<boolean> {
        let p = this.ctx.root;
        if (workspace) {
            p = workspace;
        }
        // some validation
        const checklist: string[] = [
            p,
            `${p}/package.json`,
            `${p}/.${ConfigFolderName}`,
            `${p}/.${ConfigFolderName}/settings.json`,
            `${p}/.${ConfigFolderName}/env.default.json`,
        ];
        for (const fp of checklist) {
            if (!(await fs.pathExists(path.resolve(fp)))) {
                return false;
            }
        }
        return true;
    }

      

    public async readConfigs(): Promise<Result<null, FxError>> {
        if (!fs.existsSync(`${this.ctx.root}/.${ConfigFolderName}`)) {
            this.ctx.logProvider?.warning(`[Core] readConfigs() silent pass, folder not exist:${this.ctx.root}/.${ConfigFolderName}`);
            return ok(null);
        }
        try {
            // load env
            const reg = /env\.(\w+)\.json/;
            for (const file of fs.readdirSync(`${this.ctx.root}/.${ConfigFolderName}`)) {
                const slice = reg.exec(file);
                if (!slice) {
                    continue;
                }
                const envName = slice[1];
                const filePath = `${this.ctx.root}/.${ConfigFolderName}/${file}`;
                const configJson: Json = await fs.readJson(filePath);
                const localDataPath = `${this.ctx.root}/.${ConfigFolderName}/${envName}.userdata`;
                let dict:Dict<string>;
                if(await fs.pathExists(localDataPath)){
                    const dictContent = await fs.readFile(localDataPath, "UTF-8");
                    dict = deserializeDict(dictContent);
                }
                else{
                    dict = {};
                } 
                mergeSerectData(dict, configJson);
                const solutionConfig: SolutionConfig = objectToMap(configJson);
                this.configs.set(envName, solutionConfig);
            }

            // read projectSettings
            this.ctx.projectSettings = await this.readSettings(this.ctx.root);
        } catch (e) {
            return err(error.ReadFileError(e));
        }
        return ok(null);
    }

    public async writeConfigs(): Promise<Result<null, FxError>> {
        if (!fs.existsSync(`${this.ctx.root}/.${ConfigFolderName}`)) {
            this.ctx.logProvider?.warning(`[Core] writeConfigs() silent pass, folder not exist:${this.ctx.root}/.${ConfigFolderName}`);
            return ok(null);
        }
        try {
            for (const entry of this.configs.entries()) {
                const envName = entry[0];
                const solutionConfig = entry[1];
                const configJson = mapToJson(solutionConfig);
                const filePath = `${this.ctx.root}/.${ConfigFolderName}/env.${envName}.json`;
                const localDataPath = `${this.ctx.root}/.${ConfigFolderName}/${envName}.userdata`;
                const localData = sperateSecretData(configJson);
                const content = JSON.stringify(configJson, null, 4);
                await fs.writeFile(filePath, content);
                await fs.writeFile(localDataPath, serializeDict(localData));
            }
            //write settings
            await this.writeSettings(this.ctx.root, this.ctx.projectSettings);
        } catch (e) {
            return err(error.WriteFileError(e));
        }
        return ok(null);
    }

    /**
     * provision
     */
    public async provision(answers?: ConfigMap): Promise<Result<null, FxError>> {
        return await this.selectedSolution!.provision(this.solutionContext(answers));
    }

    /**
     * deploy
     */
    public async deploy(answers?: ConfigMap): Promise<Result<null, FxError>> {
        return await this.selectedSolution!.deploy(this.solutionContext(answers));
    }

    /**
     * publish app
     */
    public async publish(answers?: ConfigMap): Promise<Result<null, FxError>> {
        return await this.selectedSolution!.publish(this.solutionContext(answers));
    }

    /**
     * create an environment
     */
    public async createEnv(env: string): Promise<Result<null, FxError>> {
        if (this.configs.has(env)) {
            return err(error.EnvAlreadyExist(env));
        } else {
            this.configs.set(env, new Map());
        }
        return ok(null);
    }

    /**
     * remove an environment
     */
    public async removeEnv(env: string): Promise<Result<null, FxError>> {
        if (!this.configs.has(env)) {
            return err(error.EnvNotExist(env));
        } else {
            this.configs.delete(env);
        }
        return ok(null);
    }

    /**
     * switch environment
     */
    public async switchEnv(env: string): Promise<Result<null, FxError>> {
        if (this.configs.has(env)) {
            this.env = env;
        } else {
            return err(error.EnvNotExist(env));
        }
        return ok(null);
    }

    /**
     * switch environment
     */
    public async listEnvs(): Promise<Result<string[], FxError>> {
        return ok(Array.from(this.configs.keys()));
    }

    private async readSettings(projectFolder: string): Promise<ProjectSettings | undefined> {
        const file = `${projectFolder}/.${ConfigFolderName}/settings.json`;
        const exist = await fs.pathExists(file);
        if (!exist) return undefined;
        const settings:ProjectSettings = await fs.readJSON(file); 
        return settings;
    }

    private async writeSettings(projectFolder: string, settings?: ProjectSettings): Promise<void> {
        if(!settings) return;
        const file = `${projectFolder}/.${ConfigFolderName}/settings.json`;
        await fs.writeFile(file, JSON.stringify(settings, null, 4));
    }

    public async scaffold(answers?: ConfigMap): Promise<Result<null, FxError>> {
        return await this.selectedSolution!.scaffold(this.solutionContext(answers));
    }

    public async withDialog(dialog: Dialog): Promise<Result<null, FxError>> {
        this.ctx.dialog = dialog;
        return ok(null);
    }

    public async withTelemetry(telemetry: TelemetryReporter): Promise<Result<null, FxError>> {
        this.ctx.telemetryReporter = telemetry;
        return ok(null);
    }

    public async withLogger(logger: LogProvider): Promise<Result<null, FxError>> {
        this.ctx.logProvider = logger;
        return ok(null);
    }

    public async withAzureAccount(azureAccount: AzureAccountProvider): Promise<Result<null, FxError>> {
        this.ctx.azureAccountProvider = azureAccount;
        return ok(null);
    }

    public async withGraphToken(graphToken: GraphTokenProvider): Promise<Result<null, FxError>> {
        this.ctx.graphTokenProvider = graphToken;
        return ok(null);
    }

    public async withAppStudioToken(appStudioToken: AppStudioTokenProvider): Promise<Result<null, FxError>> {
        this.ctx.appStudioToken = appStudioToken;
        return ok(null);
    }
    public async withTreeProvider(treeProvider: TreeProvider): Promise<Result<null, FxError>> {
        this.ctx.treeProvider = treeProvider;
        return ok(null);
    }

    /**
     * init
     */
    public async init(globalConfig?: ConfigMap): Promise<Result<null, FxError>> {
        this.globalConfig = globalConfig;

        // const that = this;

        // let initResult: Result<null, FxError> = ok(null);

        const loadResult = await Loader.loadSolutions(this.ctx);
        if (loadResult.isErr()) {
            return err(loadResult.error);
        }
        this.globalSolutions = loadResult.value;
 
        this.ctx.logProvider?.info("[Teams Toolkit] Initialized");
        return ok(null);
    }

    private async createBasicFolderStructure(answers?: ConfigMap): Promise<Result<null, FxError>> {
        if (!this.target) {
            return ok(null);
        }
        try {

            const appName = answers?.getString(QuestionAppName.name);
            await fs.writeFile(
                `${this.target.ctx.root}/package.json`,
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
                    4,
                ),
            );
            await fs.writeFile(
                `${this.target.ctx.root}/.gitignore`,
                `node_modules\n/.${ConfigFolderName}/*.env\n/.${ConfigFolderName}/*.userdata\n.DS_Store`
            );
        } catch (e) {
            return err(error.WriteFileError(e));
        }
        return ok(null);
    }

    private mergeConfigMap(source?: ConfigMap, target?: ConfigMap): ConfigMap {
        const map = new ConfigMap();
        if (source) {
            for (const entry of source) {
                map.set(entry[0], entry[1]);
            }
        }
        if (target) {
            for (const entry of target) {
                map.set(entry[0], entry[1]);
            }
        }
        return map;
    }

    private solutionContext(answers?: ConfigMap): SolutionContext {
        answers = this.mergeConfigMap(answers, this.globalConfig);
        const ctx: SolutionContext = {
            ...this.ctx,
            answers: answers,
            app: this.app,
            config: this.configs.get(this.env)!,
            dotVsCode: VscodeManager.getInstance(),
        };
        return ctx;
    }
}

/*
 * Core is a singleton which will provide primary API for UI layer component to implement
 * business logic.
 */
export class CoreProxy implements Core {
    /*
     * Core only will be initialized once by this funcion.
     */
    public static initialize() {
        if (!CoreProxy.instance) {
            CoreProxy.instance = new CoreProxy();
        }
    }

    /*
     * this is the only entry to get Core instance.
     */
    public static getInstance(): CoreProxy {
        CoreProxy.initialize();
        return CoreProxy.instance;
    }

    /*
     * The instance will be set as private so that it won't be modified from outside.
     */
    private static instance: CoreProxy;

    private coreImpl: CoreImpl;

    constructor() {
        this.coreImpl = new CoreImpl();
    }

    private async runWithErrorHandling<T>(
        name: string,
        checkAndConfig: boolean,
        notSupportedRes: Result<T, FxError>,
        fn: () => Promise<Result<T, FxError>>,
        answers? : ConfigMap
    ): Promise<Result<T, FxError>> {

        // set platform for each task
        const platform = answers?.getString("platform") as Platform;
        if(!this.coreImpl.ctx.platform && platform)
            this.coreImpl.ctx.platform = platform;
        
        try {
            // check if this project is supported
            if (checkAndConfig) {
                const supported = await this.coreImpl.isSupported();
                if (!supported) {
                    return notSupportedRes;
                }
            }
            // this.coreImpl.ctx.logProvider?.info(`[Core] run task ${name} start!`);

            // reload configurations before run lifecycle api
            if (checkAndConfig) {
                const readRes = await this.coreImpl.readConfigs();
                if (readRes.isErr()) {
                    return err(readRes.error);
                }
            }

            // do it
            const res = await fn();
            if(res.isErr())
                this.coreImpl.ctx.logProvider?.info(`[Core] run task ${name} finish, isOk: ${res.isOk()}!`);
            return res;
        } catch (e) {
            this.coreImpl.ctx.logProvider?.error(
                `[Core] run task ${name} finish, isOk: false, throw error:${JSON.stringify(e)}`,
            );
            if (
                e instanceof UserError ||
                e instanceof SystemError ||
                (e.constructor &&
                    e.constructor.name &&
                    (e.constructor.name === "SystemError" || e.constructor.name === "UserError"))
            ) {
                return err(e);
            }
            return err(returnSystemError(e, error.CoreSource, error.CoreErrorNames.UncatchedError));
        } finally {
            // persist configurations
            if (checkAndConfig) {
                const writeRes = await this.coreImpl.writeConfigs();
                if (writeRes.isErr()) {
                    this.coreImpl.ctx.logProvider?.info(`[Core] persist config failed:${writeRes.error}!`);
                    return err(writeRes.error);
                }
                // this.coreImpl.ctx.logProvider?.info(`[Core] persist config success!`);
            }
        }
    }
    withDialog(dialog: Dialog): Promise<Result<null, FxError>> {
        return this.coreImpl.withDialog(dialog);
    }
    withLogger(logger: LogProvider): Promise<Result<null, FxError>> {
        return this.coreImpl.withLogger(logger);
    }
    withAzureAccount(azureAccount: AzureAccountProvider): Promise<Result<null, FxError>> {
        return this.coreImpl.withAzureAccount(azureAccount);
    }
    withGraphToken(graphToken: GraphTokenProvider): Promise<Result<null, FxError>> {
        return this.coreImpl.withGraphToken(graphToken);
    }
    withAppStudioToken(appStudioToken: AppStudioTokenProvider): Promise<Result<null, FxError>> {
        return this.coreImpl.withAppStudioToken(appStudioToken);
    }
    withTelemetry(logger: TelemetryReporter): Promise<Result<null, FxError>> {
        return this.coreImpl.withTelemetry(logger);
    }
    withTreeProvider(treeProvider: TreeProvider): Promise<Result<null, FxError>> {
        return this.coreImpl.withTreeProvider(treeProvider);
    }
    async init(globalConfig?: ConfigMap): Promise<Result<null, FxError>> {
        return await this.runWithErrorHandling<null>("init", false, ok(null), () => this.coreImpl.init(globalConfig));
    }
    async getQuestions(stage: Stage, platform: Platform): Promise<Result<QTreeNode | undefined, FxError>> {
        const checkAndConfig = !(stage === Stage.create);
        return await this.runWithErrorHandling<QTreeNode | undefined>(
            "getQuestions",
            checkAndConfig,
            ok(undefined),
            () => this.coreImpl.getQuestions(stage, platform),
        );
    }
    async getQuestionsForUserTask(func: Func, platform: Platform): Promise<Result<QTreeNode | undefined, FxError>> {
        return await this.runWithErrorHandling<QTreeNode | undefined>(
            "getQuestionsForUserTask",
            true,
            err(error.NotSupportedProjectType()),
            () => this.coreImpl.getQuestionsForUserTask(func, platform),
        );
    }
    async executeUserTask(func: Func, answers?: ConfigMap): Promise<Result<any, FxError>> {
         ////////////////hard code for VS init scenario
         const platform = answers?.getString("platform");
         let check = true;
         if (Platform.VS === platform) check = false;
         ////////////////////////////
 
         return await this.runWithErrorHandling<QTreeNode | undefined>(
             "executeUserTask",
             check,
             err(error.NotSupportedProjectType()),
             () => this.coreImpl.executeUserTask(func, answers),
             answers
         );
    }
    async callFunc(func: Func, answer?: ConfigMap): Promise<Result<any, FxError>> {
        const stage = answer?.getString("stage");
        const checkAndConfig = !(stage === Stage.create);
        return await this.runWithErrorHandling("callFunc", checkAndConfig, ok({}), () =>
            this.coreImpl.callFunc(func, answer), answer
        );
    }
    async create(answers?: ConfigMap | undefined): Promise<Result<null, FxError>> {
        return await this.runWithErrorHandling<null>("create", false, ok(null), () => this.coreImpl.create(answers), answers);
    }
    async update(answers?: ConfigMap | undefined): Promise<Result<null, FxError>> {
        return await this.runWithErrorHandling<null>("update", true, ok(null), () => this.coreImpl.update(answers), answers);
    }
    async open(workspace?: string | undefined): Promise<Result<null, FxError>> {
        return this.runWithErrorHandling<null>("open", false, ok(null), () => this.coreImpl.open(workspace)); //open project readConfigs in open() logic!!!
    }
    async scaffold(answers?: ConfigMap | undefined): Promise<Result<null, FxError>> {
        return await this.runWithErrorHandling<null>("scaffold", true, ok(null), () => this.coreImpl.scaffold(answers), answers);
    }
    async localDebug(answers?: ConfigMap | undefined): Promise<Result<null, FxError>> {
        return await this.runWithErrorHandling<null>("localDebug", true, err(error.NotSupportedProjectType()), () =>
            this.coreImpl.localDebug(answers), answers
        );
    }
    async provision(answers?: ConfigMap | undefined): Promise<Result<null, FxError>> {
        return await this.runWithErrorHandling<null>("provision", true, err(error.NotSupportedProjectType()), () =>
            this.coreImpl.provision(answers), answers
        );
    }
    async deploy(answers?: ConfigMap | undefined): Promise<Result<null, FxError>> {
        return await this.runWithErrorHandling<null>("deploy", true, err(error.NotSupportedProjectType()), () =>
            this.coreImpl.deploy(answers), answers
        );
    }
    async publish(answers?: ConfigMap | undefined): Promise<Result<null, FxError>> {
        return await this.runWithErrorHandling<null>("publish", true, err(error.NotSupportedProjectType()), () =>
            this.coreImpl.publish(answers), answers
        );
    }
    async createEnv(env: string): Promise<Result<null, FxError>> {
        return await this.runWithErrorHandling<null>("createEnv", true, err(error.NotSupportedProjectType()), () =>
            this.coreImpl.createEnv(env),
        );
    }
    async removeEnv(env: string): Promise<Result<null, FxError>> {
        return await this.runWithErrorHandling<null>("removeEnv", true, err(error.NotSupportedProjectType()), () =>
            this.coreImpl.removeEnv(env),
        );
    }
    async switchEnv(env: string): Promise<Result<null, FxError>> {
        return await this.runWithErrorHandling<null>("switchEnv", true, err(error.NotSupportedProjectType()), () =>
            this.coreImpl.switchEnv(env),
        );
    }
    async listEnvs(): Promise<Result<string[], FxError>> {
        return await this.runWithErrorHandling<string[]>("listEnvs", true, err(error.NotSupportedProjectType()), () =>
            this.coreImpl.listEnvs(),
        );
    }
}

export async function Default(): Promise<Result<CoreProxy, FxError>> {
    const result = await CoreProxy.getInstance().init();
    if (result.isErr()) {
        return err(result.error);
    }
    return ok(CoreProxy.getInstance());
}
