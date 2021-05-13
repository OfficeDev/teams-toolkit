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
  FxError,
  ConfigFolderName,
  Json,
  Dict,
  ProjectSettings,
  MsgLevel,
} from "@microsoft/teamsfx-api";
import * as path from "path";
import * as error from "./error";
import { Loader, Meta } from "./loader";
import {
  deserializeDict,
  fetchCodeZip,
  getStrings,
  mapToJson,
  mergeSerectData,
  objectToMap,
  saveFilesRecursively,
  serializeDict,
  sperateSecretData,
} from "../common/tools";
import { VscodeManager } from "./vscodeManager";
import {
  CoreQuestionNames,
  ProjectNamePattern,
  QuestionAppName,
  QuestionRootFolder,
  QuestionSelectSolution,
  SampleSelect,
  ScratchOptionNo,
  ScratchOptionYes,
  ScratchOrSampleSelect,
} from "./question";
import * as jsonschema from "jsonschema";
import { AzureSubscription, getSubscriptionList } from "./loginUtils";
import { sleep } from "../plugins/resource/spfx/utils/utils";
import AdmZip from "adm-zip";

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
  async getQuestions(
    stage: Stage,
    platform: Platform
  ): Promise<Result<QTreeNode | undefined, FxError>> {
    this.ctx.platform = platform;
    const answers = new ConfigMap();
    answers.set("stage", stage);
    answers.set("substage", "getQuestions");
    const node = new QTreeNode({ type: NodeType.group });
    if (stage === Stage.create) {
      const scratchSelectNode = new QTreeNode(ScratchOrSampleSelect);
      node.addChild(scratchSelectNode);

      const scratchNode = new QTreeNode({ type: NodeType.group });
      scratchNode.condition = { equals: ScratchOptionYes.id };
      scratchSelectNode.addChild(scratchNode);

      const sampleNode = new QTreeNode(SampleSelect);
      sampleNode.condition = { equals: ScratchOptionNo.id };
      scratchSelectNode.addChild(sampleNode);

      //make sure that global solutions are loaded
      const solutionNames: string[] = [];
      for (const k of this.globalSolutions.keys()) {
        solutionNames.push(k);
      }
      const selectSolution: SingleSelectQuestion = QuestionSelectSolution;
      selectSolution.option = solutionNames;
      const solutionSelectNode = new QTreeNode(selectSolution);
      scratchNode.addChild(solutionSelectNode);
      for (const [k, v] of this.globalSolutions) {
        if (v.getQuestions) {
          const res = await v.getQuestions(stage, this.solutionContext(answers));
          if (res.isErr()) return res;
          if (res.value) {
            const solutionNode = res.value as QTreeNode;
            solutionNode.condition = { equals: k };
            if (solutionNode.data) solutionSelectNode.addChild(solutionNode);
          }
        }
      }

      scratchNode.addChild(new QTreeNode(QuestionRootFolder));
      scratchNode.addChild(new QTreeNode(QuestionAppName));
      sampleNode.addChild(new QTreeNode(QuestionRootFolder));
    } else if (this.selectedSolution) {
      const res = await this.selectedSolution.getQuestions(stage, this.solutionContext(answers));
      if (res.isErr()) return res;
      if (res.value) {
        const child = res.value as QTreeNode;
        if (child.data) node.addChild(child);
      }
    }
    return ok(node.trim());
  }

  async getQuestionsForUserTask(
    func: Func,
    platform: Platform
  ): Promise<Result<QTreeNode | undefined, FxError>> {
    this.ctx.platform = platform;
    const namespace = func.namespace;
    const array = namespace ? namespace.split("/") : [];
    if (namespace && "" !== namespace && array.length > 0) {
      const solutionName = array[0];
      const solution = this.globalSolutions.get(solutionName);
      if (solution && solution.getQuestionsForUserTask) {
        const solutioContext = this.solutionContext();
        const res = await solution.getQuestionsForUserTask(func, solutioContext);
        if (res.isOk()) {
          if (res.value) {
            const node = res.value.trim();
            return ok(node);
          }
        }
        return res;
      }
    }
    return err(
      returnUserError(
        new Error(`getQuestionsForUserTaskRouteFailed:${JSON.stringify(func)}`),
        error.CoreSource,
        error.CoreErrorNames.getQuestionsForUserTaskRouteFailed
      )
    );
  }
  async executeUserTask(
    func: Func,
    answer?: ConfigMap
  ): Promise<Result<QTreeNode | undefined, FxError>> {
    const namespace = func.namespace;
    const array = namespace ? namespace.split("/") : [];
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
        error.CoreErrorNames.executeUserTaskRouteFailed
      )
    );
  }

  async callFunc(func: Func, answer?: ConfigMap): Promise<Result<any, FxError>> {
    const namespace = func.namespace;
    const array = namespace ? namespace.split("/") : [];
    if (!namespace || "" === namespace || array.length === 0) {
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
        error.CoreErrorNames.CallFuncRouteFailed
      )
    );
  }

  /**
   * create
   */
  public async create(answers?: ConfigMap): Promise<Result<null, FxError>> {
    if (!this.ctx.dialog) {
      return err(error.InvalidContext());
    }

    const folder = answers?.getString(QuestionRootFolder.name);

    const scratch = answers?.getString(CoreQuestionNames.CreateFromScratch);
    if (scratch === ScratchOptionNo.id) {
      const samples = answers?.getOptionItem(CoreQuestionNames.Samples);
      if (samples && samples.data && folder) {
        const answer = (
          await this.ctx.dialog?.communicate(
            new DialogMsg(DialogType.Show, {
              description: `Clone '${samples.label}' from Github. This will clone '${samples.label}' repository to your local machine`,
              level: MsgLevel.Info,
              items: ["Clone", "Cancel"],
            })
          )
        )?.getAnswer();
        if (answer === "Clone") {
          const url = samples.data as string;
          const sampleId = samples.id;
          const progress = this.ctx.dialog.createProgressBar("Fetch sample app", 2);
          progress.start();
          try {
            progress.next(`Downloading from '${url}'`);
            const fetchRes = await fetchCodeZip(url);
            progress.next("Unzipping the sample package");
            if (fetchRes !== undefined) {
              await saveFilesRecursively(new AdmZip(fetchRes.data), sampleId, folder);
              await this.ctx.dialog?.communicate(
                new DialogMsg(DialogType.Ask, {
                  type: QuestionType.OpenFolder,
                  description: `${folder}\\${sampleId}`,
                })
              );
            } else {
              progress.end();
              return err(error.DownloadSampleFail());
            }
          } finally {
            progress.end();
          }
        }
        return ok(null);
      }
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
    if (undefined === appName)
      return err(
        new UserError(error.CoreErrorNames.InvalidInput, `App Name is empty`, error.CoreSource)
      );

    const validateResult = jsonschema.validate(appName, {
      pattern: ProjectNamePattern,
    });
    if (validateResult.errors && validateResult.errors.length > 0) {
      return err(
        new UserError(
          error.CoreErrorNames.InvalidInput,
          `${validateResult.errors[0].message}`,
          error.CoreSource
        )
      );
    }

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
    this.target.ctx.root = projFolder;

    const loadRes = await Loader.loadSolutions(this.target.ctx);
    if (loadRes.isErr()) {
      return err(loadRes.error);
    }
    const solutionName = answers?.getString(QuestionSelectSolution.name);
    this.ctx.logProvider?.info(`[Core] create - select solution`);
    for (const s of loadRes.value.values()) {
      if (s.name === solutionName) {
        this.target.selectedSolution = s;
        break;
      }
    }

    if (!this.target.selectedSolution) {
      return err(
        new UserError(
          error.CoreErrorNames.InvalidInput,
          `Solution is not selected!`,
          error.CoreSource
        )
      );
    }

    this.target.ctx.projectSettings = {
      appName: appName,
      solutionSettings: {
        name: this.target.selectedSolution.name,
        version: this.target.selectedSolution.version,
      },
    };

    const targetFolder = path.resolve(this.target.ctx.root);

    await fs.ensureDir(targetFolder);
    await fs.ensureDir(`${targetFolder}/.${ConfigFolderName}`);

    this.ctx.logProvider?.info(`[Core] create - call solution.create()`);
    const solutionContext = this.target.solutionContext(answers);
    const result = await this.target.selectedSolution.create(solutionContext);
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
    const scaffoldRes = await this.target.selectedSolution.scaffold(solutionContext);

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
      })
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
    const t1 = new Date().getTime();
    let supported = true;
    if (!workspace) {
      supported = false;
    } else {
      this.ctx.root = workspace;
      supported = await this.isSupported();
      if (!supported) {
        this.ctx.logProvider?.warning(`non Teams project:${workspace}`);
      } else {
        await this.readConfigs();
      }
    }
    const t2 = new Date().getTime();
    let getSelectSubItem:
      | undefined
      | ((token: any, valid: boolean) => Promise<[TreeItem, boolean]>) = undefined;
    if (this.ctx.treeProvider) {
      getSelectSubItem = async (token: any, valid: boolean): Promise<[TreeItem, boolean]> => {
        let selectSubLabel = "";
        const subscriptions = await getSubscriptionList(token);
        const activeSubscriptionId = this.configs
          .get(this.env!)!
          .get("solution")
          ?.getString("subscriptionId");
        const activeSubscription = subscriptions.find(
          (subscription) => subscription.subscriptionId === activeSubscriptionId
        );

        let icon = "";
        let contextValue = "selectSubscription";
        if (activeSubscriptionId === undefined || activeSubscription === undefined) {
          selectSubLabel = `${subscriptions.length} subscriptions discovered`;
          icon = "subscriptions";

          if (subscriptions.length === 0) {
            contextValue = "emptySubscription";
          }
        } else {
          selectSubLabel = activeSubscription.displayName;
          icon = "subcriptionSelected";
        }
        return [
          {
            commandId: "fx-extension.selectSubscription",
            label: selectSubLabel,
            callback: () => {
              return Promise.resolve(ok(null));
            },
            parent: "fx-extension.signinAzure",
            contextValue: valid ? contextValue : "invalidFxProject",
            icon: icon,
          },
          !(activeSubscriptionId === undefined || activeSubscription === undefined),
        ];
      };

      const selectSubscriptionCallback = async (args?: any[]): Promise<Result<null, FxError>> => {
        this.ctx?.telemetryReporter?.sendTelemetryEvent(TelemetryEvent.SelectSubscription, {
          [TelemetryProperty.TriggerFrom]:
            args && args.toString() === "TreeView"
              ? TelemetryTiggerFrom.TreeView
              : TelemetryTiggerFrom.CommandPalette,
        });

        const azureToken = await this.ctx.azureAccountProvider?.getAccountCredentialAsync();
        const subscriptions: AzureSubscription[] = await getSubscriptionList(azureToken!);
        const subscriptionNames: string[] = subscriptions.map(
          (subscription) => subscription.displayName
        );
        const subscriptionName = (
          await this.ctx.dialog?.communicate(
            new DialogMsg(DialogType.Ask, {
              type: QuestionType.Radio,
              description: "Please select a subscription",
              options: subscriptionNames,
            })
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

        const subscription = subscriptions.find(
          (subscription) => subscription.displayName === subscriptionName
        );

        if (subscription) {
          await this.readConfigs();
          this.configs
            .get(this.env!)!
            .get("solution")!
            .set("subscriptionId", subscription.subscriptionId);
          this.writeConfigs();
          this.ctx.treeProvider?.refresh([
            {
              commandId: "fx-extension.selectSubscription",
              label: subscriptionName,
              callback: () => {
                return Promise.resolve(ok(null));
              },
              parent: "fx-extension.signinAzure",
              contextValue: "selectSubscription",
              icon: "subscriptionSelected",
            },
          ]);
        }

        return ok(null);
      };

      const signinM365Callback = async (args?: any[]): Promise<Result<null, FxError>> => {
        this.ctx?.telemetryReporter?.sendTelemetryEvent(TelemetryEvent.LoginStart, {
          [TelemetryProperty.TriggerFrom]:
            args && args.toString() === "TreeView"
              ? TelemetryTiggerFrom.TreeView
              : TelemetryTiggerFrom.CommandPalette,
          [TelemetryProperty.AccountType]: AccountType.M365,
        });
        const token = await this.ctx.appStudioToken?.getJsonObject(true);
        if (token !== undefined) {
          this.ctx.treeProvider?.refresh([
            {
              commandId: "fx-extension.signinM365",
              label: (token as any).upn ? (token as any).upn : "",
              callback: signinM365Callback,
              parent: TreeCategory.Account,
              contextValue: "signedinM365",
              icon: "M365",
            },
          ]);
        }

        return ok(null);
      };

      const signinAzureCallback = async (
        validFxProject: boolean,
        args?: any[]
      ): Promise<Result<null, FxError>> => {
        this.ctx?.telemetryReporter?.sendTelemetryEvent(TelemetryEvent.LoginStart, {
          [TelemetryProperty.TriggerFrom]:
            args && args.toString() === "TreeView"
              ? TelemetryTiggerFrom.TreeView
              : TelemetryTiggerFrom.CommandPalette,
          [TelemetryProperty.AccountType]: AccountType.Azure,
        });

        const token = await this.ctx.azureAccountProvider?.getAccountCredentialAsync(true);
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

          const subItem = await getSelectSubItem!(token, validFxProject);
          this.ctx.treeProvider?.add([subItem[0]]);
        }

        return ok(null);
      };

      let azureAccountLabel = "Sign in to Azure";
      let azureAccountContextValue = "signinAzure";
      const token = this.ctx.azureAccountProvider?.getAccountCredential();
      if (token !== undefined) {
        azureAccountLabel = (token as any).username ? (token as any).username : "";
        azureAccountContextValue = "signedinAzure";
      }

      this.ctx.appStudioToken?.setStatusChangeMap(
        "tree-view",
        (
          status: string,
          token?: string | undefined,
          accountInfo?: Record<string, unknown> | undefined
        ) => {
          if (status === "SignedIn") {
            signinM365Callback();
          } else if (status === "SigningIn") {
            this.ctx.treeProvider?.refresh([
              {
                commandId: "fx-extension.signinM365",
                label: "M365: Signing in...",
                callback: signinM365Callback,
                parent: TreeCategory.Account,
                icon: "spinner",
              },
            ]);
          } else if (status === "SignedOut") {
            this.ctx.treeProvider?.refresh([
              {
                commandId: "fx-extension.signinM365",
                label: "Sign in to M365",
                callback: signinM365Callback,
                parent: TreeCategory.Account,
                icon: "M365",
                contextValue: "signinM365",
              },
            ]);
          }
          return Promise.resolve();
        }
      );
      this.ctx.azureAccountProvider?.setStatusChangeMap(
        "tree-view",
        async (
          status: string,
          token?: string | undefined,
          accountInfo?: Record<string, unknown> | undefined
        ) => {
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
                  icon: "azure",
                },
              ]);
              const subItem = await getSelectSubItem!(token, supported);
              this.ctx.treeProvider?.add([subItem[0]]);

              if (supported && !subItem[1]) {
                await selectSubscriptionCallback();
              }
            }
          } else if (status === "SigningIn") {
            this.ctx.treeProvider?.refresh([
              {
                commandId: "fx-extension.signinAzure",
                label: "Azure: Signing in...",
                callback: signinAzureCallback,
                parent: TreeCategory.Account,
                icon: "spinner",
              },
            ]);
          } else if (status === "SignedOut") {
            this.ctx.treeProvider?.refresh([
              {
                commandId: "fx-extension.signinAzure",
                label: "Sign in to Azure",
                callback: signinAzureCallback,
                parent: TreeCategory.Account,
                icon: "azure",
                contextValue: "signinAzure",
              },
            ]);
          }

          return Promise.resolve();
        }
      );

      this.ctx.treeProvider.add([
        {
          commandId: "fx-extension.signinM365",
          label: "Sign in to M365",
          callback: signinM365Callback,
          parent: TreeCategory.Account,
          contextValue: "signinM365",
          icon: "M365",
          tooltip: {
            isMarkdown: true,
            value:
              "M365 ACCOUNT  \nThe Teams Toolkit requires an Microsoft 365 organizational account where Teams is running and has been registered.",
          },
        },
        {
          commandId: "fx-extension.signinAzure",
          label: azureAccountLabel,
          callback: async (args?: any[]) => {
            return signinAzureCallback(supported, args);
          },
          parent: TreeCategory.Account,
          contextValue: azureAccountContextValue,
          subTreeItems: [],
          icon: "azure",
          tooltip: {
            isMarkdown: true,
            value:
              "AZURE ACCOUNT  \nThe Teams Toolkit may require an Azure subscription to deploy the Azure resources for your project.",
          },
        },
        {
          commandId: "fx-extension.specifySubscription",
          label: "Specify subscription",
          callback: selectSubscriptionCallback,
          parent: undefined,
        },
      ]);
    }

    if (!supported) return ok(null);

    const t3 = new Date().getTime();
    for (const entry of this.globalSolutions.entries()) {
      this.selectedSolution = entry[1];
      break;
    }

    if (this.selectedSolution === undefined) {
      return err(
        new UserError(error.CoreErrorNames.LoadSolutionFailed, "No Solution", error.CoreSource)
      );
    }

    this.env = "default";

    const res = await this.selectedSolution.open(this.solutionContext());
    const t4 = new Date().getTime();
    //this.ctx.logProvider?.debug(`core.open() time  ----- t2-t1:${t2-t1}, t3-t2:${t3-t2}, t4-t3:${t4-t3}`);
    return res;
  }

  public async isSupported(workspace?: string): Promise<boolean> {
    let p = this.ctx.root;
    if (workspace) {
      p = workspace;
    }
    // some validation
    const checklist: string[] = [
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
      this.ctx.logProvider?.warning(
        `[Core] readConfigs() - folder does not exist: ${this.ctx.root}/.${ConfigFolderName}`
      );
      return ok(null);
    }
    let res: Result<null, FxError> = ok(null);
    for (let i = 0; i < 5; ++i) {
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
          let dict: Dict<string>;
          if (await fs.pathExists(localDataPath)) {
            const dictContent = await fs.readFile(localDataPath, "UTF-8");
            dict = deserializeDict(dictContent);
          } else {
            dict = {};
          }
          mergeSerectData(dict, configJson);
          const solutionConfig: SolutionConfig = objectToMap(configJson);
          this.configs.set(envName, solutionConfig);
        }

        // read projectSettings
        this.ctx.projectSettings = await this.readSettings(this.ctx.root);
        res = ok(null);
        break;
      } catch (e) {
        res = err(error.ReadFileError(e));
        sleep(10);
      }
    }
    return res;
  }

  public async writeConfigs(): Promise<Result<null, FxError>> {
    if (!fs.existsSync(`${this.ctx.root}/.${ConfigFolderName}`)) {
      this.ctx.logProvider?.warning(
        `[Core] writeConfigs() - folder does not exist:${this.ctx.root}/.${ConfigFolderName}`
      );
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
    const provisionRes = await this.selectedSolution!.provision(this.solutionContext(answers));
    if (provisionRes.isErr()) {
      if (provisionRes.error.message.startsWith(getStrings().solution.CancelProvision)) {
        return ok(null);
      }
      return err(provisionRes.error);
    }
    return ok(null);
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
    const settings: ProjectSettings = await fs.readJSON(file);
    return settings;
  }

  private async writeSettings(projectFolder: string, settings?: ProjectSettings): Promise<void> {
    if (!settings) return;
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

  public async withAzureAccount(
    azureAccount: AzureAccountProvider
  ): Promise<Result<null, FxError>> {
    this.ctx.azureAccountProvider = azureAccount;
    return ok(null);
  }

  public async withGraphToken(graphToken: GraphTokenProvider): Promise<Result<null, FxError>> {
    this.ctx.graphTokenProvider = graphToken;
    return ok(null);
  }

  public async withAppStudioToken(
    appStudioToken: AppStudioTokenProvider
  ): Promise<Result<null, FxError>> {
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
              test: 'echo "Error: no test specified" && exit 1',
            },
            license: "MIT",
          },
          null,
          4
        )
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
    answers?: ConfigMap
  ): Promise<Result<T, FxError>> {
    // set platform for each task
    const platform = answers?.getString("platform") as Platform;
    if (!this.coreImpl.ctx.platform && platform) this.coreImpl.ctx.platform = platform;

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
      if (res.isErr())
        this.coreImpl.ctx.logProvider?.info(`[Core] run task ${name} finish, isOk: ${res.isOk()}!`);
      return res;
    } catch (e) {
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
    return await this.runWithErrorHandling<null>("init", false, ok(null), () =>
      this.coreImpl.init(globalConfig)
    );
  }
  async getQuestions(
    stage: Stage,
    platform: Platform
  ): Promise<Result<QTreeNode | undefined, FxError>> {
    const checkAndConfig = !(stage === Stage.create);
    return await this.runWithErrorHandling<QTreeNode | undefined>(
      "getQuestions",
      checkAndConfig,
      ok(undefined),
      () => this.coreImpl.getQuestions(stage, platform)
    );
  }
  async getQuestionsForUserTask(
    func: Func,
    platform: Platform
  ): Promise<Result<QTreeNode | undefined, FxError>> {
    return await this.runWithErrorHandling<QTreeNode | undefined>(
      "getQuestionsForUserTask",
      true,
      err(error.NotSupportedProjectType()),
      () => this.coreImpl.getQuestionsForUserTask(func, platform)
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
    return await this.runWithErrorHandling(
      "callFunc",
      checkAndConfig,
      ok({}),
      () => this.coreImpl.callFunc(func, answer),
      answer
    );
  }
  async create(answers?: ConfigMap | undefined): Promise<Result<null, FxError>> {
    return await this.runWithErrorHandling<null>(
      "create",
      false,
      ok(null),
      () => this.coreImpl.create(answers),
      answers
    );
  }
  async update(answers?: ConfigMap | undefined): Promise<Result<null, FxError>> {
    return await this.runWithErrorHandling<null>(
      "update",
      true,
      ok(null),
      () => this.coreImpl.update(answers),
      answers
    );
  }
  async open(workspace?: string | undefined): Promise<Result<null, FxError>> {
    return this.runWithErrorHandling<null>("open", false, ok(null), () =>
      this.coreImpl.open(workspace)
    ); //open project readConfigs in open() logic!!!
  }
  async scaffold(answers?: ConfigMap | undefined): Promise<Result<null, FxError>> {
    return await this.runWithErrorHandling<null>(
      "scaffold",
      true,
      ok(null),
      () => this.coreImpl.scaffold(answers),
      answers
    );
  }
  async localDebug(answers?: ConfigMap | undefined): Promise<Result<null, FxError>> {
    return await this.runWithErrorHandling<null>(
      "localDebug",
      true,
      err(error.NotSupportedProjectType()),
      () => this.coreImpl.localDebug(answers),
      answers
    );
  }
  async provision(answers?: ConfigMap | undefined): Promise<Result<null, FxError>> {
    return await this.runWithErrorHandling<null>(
      "provision",
      true,
      err(error.NotSupportedProjectType()),
      () => this.coreImpl.provision(answers),
      answers
    );
  }
  async deploy(answers?: ConfigMap | undefined): Promise<Result<null, FxError>> {
    return await this.runWithErrorHandling<null>(
      "deploy",
      true,
      err(error.NotSupportedProjectType()),
      () => this.coreImpl.deploy(answers),
      answers
    );
  }
  async publish(answers?: ConfigMap | undefined): Promise<Result<null, FxError>> {
    return await this.runWithErrorHandling<null>(
      "publish",
      true,
      err(error.NotSupportedProjectType()),
      () => this.coreImpl.publish(answers),
      answers
    );
  }
  async createEnv(env: string): Promise<Result<null, FxError>> {
    return await this.runWithErrorHandling<null>(
      "createEnv",
      true,
      err(error.NotSupportedProjectType()),
      () => this.coreImpl.createEnv(env)
    );
  }
  async removeEnv(env: string): Promise<Result<null, FxError>> {
    return await this.runWithErrorHandling<null>(
      "removeEnv",
      true,
      err(error.NotSupportedProjectType()),
      () => this.coreImpl.removeEnv(env)
    );
  }
  async switchEnv(env: string): Promise<Result<null, FxError>> {
    return await this.runWithErrorHandling<null>(
      "switchEnv",
      true,
      err(error.NotSupportedProjectType()),
      () => this.coreImpl.switchEnv(env)
    );
  }
  async listEnvs(): Promise<Result<string[], FxError>> {
    return await this.runWithErrorHandling<string[]>(
      "listEnvs",
      true,
      err(error.NotSupportedProjectType()),
      () => this.coreImpl.listEnvs()
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

enum TelemetryTiggerFrom {
  CommandPalette = "CommandPalette",
  TreeView = "TreeView",
}

enum TelemetryProperty {
  TriggerFrom = "trigger-from",
  AccountType = "account-type",
}

enum TelemetryEvent {
  LoginStart = "login-start",
  SelectSubscription = "select-subscription",
}

export enum AccountType {
  M365 = "m365",
  Azure = "azure",
}
