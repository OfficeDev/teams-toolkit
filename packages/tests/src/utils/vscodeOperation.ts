// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as os from "os";
import * as path from "path";
import * as fs from "fs-extra";
import {
  ActivityBar,
  BottomBarPanel,
  By,
  InputBox,
  Key,
  NotificationType,
  TerminalView,
  until,
  VSBrowser,
  WebDriver,
  Workbench,
  SideBarView,
  EditorView,
  WebElement,
  ModalDialog,
} from "vscode-extension-tester";
import {
  CommandPaletteCommands,
  Extension,
  OptionType,
  Timeout,
  TreeViewCommands,
  CreateProjectQuestion,
} from "./constants";
import { RetryHandler } from "./retryHandler";
import isWsl from "is-wsl";
import { Env } from "./env";
import { execCommand } from "./execCommand";
import { assert } from "chai";
import { getScreenshotName } from "./nameUtil";

export async function ensureExtensionActivated(): Promise<void> {
  const driver = VSBrowser.instance.driver;
  await driver.wait(async () => {
    return await RetryHandler.retry(async () => {
      // Left activity bar (Explorer, Search, ...)
      const activityBar = new ActivityBar();

      const views = await activityBar.getViewControls();
      for (const view of views) {
        const title = await view.getTitle();
        if (title === Extension.displayName || title === "") {
          // Left view section
          const extensionView = await view.openView();
          const sidebar = await driver.findElement(
            By.id("workbench.parts.sidebar")
          );
          const welcomeView = await sidebar.findElement(
            By.className("welcome-view-content")
          );
          if (welcomeView) {
            const welcomeContent = await welcomeView.getText();
            if (welcomeContent.includes(Extension.sidebarWelcomeContentName)) {
              // wait for activation
              await driver.sleep(Timeout.shortTimeLoading);
              return true;
            }
          }
          const sections = await sidebar.findElements(
            By.className("split-view-view")
          );

          for (const section of sections) {
            const sectionTitle = await section
              .findElement(By.css(".title"))
              .getText();
            const sectionText = await section
              .findElement(By.css(".pane-body"))
              .getText();
            const treeViewActivated =
              sectionTitle === Extension.activatedItemName &&
              sectionText.includes(Extension.sidebarWelcomeContentName);
            if (treeViewActivated) {
              // wait for activation
              await driver.sleep(Timeout.shortTimeLoading);
              await VSBrowser.instance.takeScreenshot("extension-activated");
              return true;
            }
          }
        }
      }
      return false;
    });
  }, Timeout.activatingExtension);
}

export async function waitForTerminal(
  title: string,
  message?: string
): Promise<void> {
  const driver = VSBrowser.instance.driver;
  await driver.wait(async () => {
    return await RetryHandler.retry(async () => {
      await VSBrowser.instance.waitForWorkbench();
      await getOutPutError();
      await execCommandIfExist("Terminal: Switch Active Terminal");
      const found = await selectQuickPickWithWord(title);
      if (found) {
        if (message) {
          return await findWordFromTerminal(message);
        }
        return true;
      } else {
        console.log("[Pending]: ", title, " not ready, try again...");
      }
      return false;
    });
  }, Timeout.prepareTestCase);
}

export async function openExistingProject(folder: string): Promise<void> {
  const driver = VSBrowser.instance.driver;
  console.log("open project folder");
  await RetryHandler.retry(async () => {
    const workbench = new Workbench();
    // open test folder
    console.log(os.type());
    if (os.type() === "Darwin") {
      await execCommandIfExist("File: Open...");
    } else {
      await workbench.executeCommand("File: Open Folder");
    }
    const input = await InputBox.create();
    await inputFolderPath(driver, input, folder);
    await input.confirm();

    // wait for window ready
    await driver.sleep(Timeout.reloadWindow);
    await driver.wait(until.stalenessOf(workbench));
    await VSBrowser.instance.takeScreenshot(
      getScreenshotName("openExistingProject")
    );
  });
  await VSBrowser.instance.waitForWorkbench();
  await ensureExtensionActivated();
  await execCommandIfExist("View: Toggle Full Screen");
}

export async function startDebugging(
  item = "Debug (Chrome)"
): Promise<boolean> {
  // open terminal to avoid terminal not invisible issue
  console.log("start debugging...");
  await openTerminalView();
  return await RetryHandler.retry(async () => {
    await new Workbench().executeCommand("Debug: Select and Start Debugging");
    return await selectQuickPick(item);
  });
}

export async function stopDebugging(): Promise<void> {
  try {
    await execCommandIfExist("Debug: Stop", Timeout.closeDebugWindow);
    await execCommandIfExist("Debug: Disconnect", Timeout.closeDebugWindow);
  } catch (error) {
    console.log("Failed to stop debugging");
  }
}

export async function closeWorkspace(): Promise<void> {
  try {
    await execCommandIfExist("Workspaces: Close Workspace", Timeout.webView);
  } catch (error) {
    console.log("Failed to Close Workspace");
  }
}

export async function execCommandIfExist(
  commandName: string,
  timeout?: number
): Promise<void> {
  const driver = VSBrowser.instance.driver;
  await VSBrowser.instance.waitForWorkbench();
  if (os.type() === "Darwin") {
    // command + P
    await driver.actions().keyDown(Key.COMMAND).keyDown("P").perform();
    await driver.actions().keyUp(Key.COMMAND).keyUp("P").perform();
  } else {
    await driver.actions().keyDown(Key.CONTROL).keyDown("P").perform();
    await driver.actions().keyUp(Key.CONTROL).keyUp("P").perform();
  }
  const input = await driver.findElement(
    By.css(".quick-input-and-message .input")
  );
  await input.sendKeys(commandName);
  await driver.sleep(Timeout.input);
  const lists =
    (await driver.findElements(By.css(".quick-input-list .monaco-list-row"))) ??
    [];
  for (const list of lists) {
    const text = await list.getText();
    if (text.includes(commandName)) {
      await list.click();
      await driver.sleep(500);
      console.log("[execCommand]: ", commandName);
      if (timeout) {
        await driver.sleep(timeout);
      }
      return;
    }
  }
  console.log("[Pending]: ", commandName, " not found, try again...");
}

export async function isEmptyMessage(retry: number) {
  if (!retry) return;
  const center = await new Workbench().openNotificationsCenter();
  await center.getDriver().sleep(1000 * 30);
  const notifications = await center.getNotifications(NotificationType.Any);
  if (notifications.length === 0) return;
  console.log("waiting count: ", retry);
  await isEmptyMessage(--retry);
}

export async function isFinish(flag: boolean, retry: number) {
  if (!retry) return;
  if (flag) return;
  const driver = VSBrowser.instance.driver;
  driver.sleep(1000 * 30);
  const terminal = await new BottomBarPanel().openTerminalView();
  const text = await terminal.getText();
  console.log("stdout: -----", text);
  const isfinish = text.includes("webpack compiled successfully");
  if (isfinish) return;
  else isFinish(false, --retry);
}

export async function getNotification(
  notificationMessage: string,
  timeout?: number,
  retries = 5,
  errorFlags?: string[]
): Promise<boolean> {
  const driver = VSBrowser.instance.driver;
  if (errorFlags) {
    const center = await new Workbench().openNotificationsCenter();
    await center.getDriver().sleep(500);
    const notifications = await center.getNotifications(NotificationType.Any);
    for (const notification of notifications) {
      const message = await notification.getMessage();
      for (const errorFlag of errorFlags) {
        if (message.includes(errorFlag)) {
          await VSBrowser.instance.takeScreenshot(getScreenshotName("error"));
          throw new Error(`Get error message: ${message}`);
        }
      }
    }
  }
  return await RetryHandler.retry(async (retries: number) => {
    const center = await new Workbench().openNotificationsCenter();
    await center.getDriver().sleep(500);
    const notifications = await center.getNotifications(NotificationType.Any);
    if (retries != 0 && timeout) {
      await driver.sleep(timeout);
    }
    for (const notification of notifications) {
      const message = await notification.getMessage();
      if (message.includes(notificationMessage)) {
        console.log(`Received notification: ${notificationMessage}`);
        return true;
      }
    }
    await VSBrowser.instance.takeScreenshot(getScreenshotName("error"));
    throw new Error(`Not received notification: ${notificationMessage}`);
  }, retries);
}

export async function clearNotifications(): Promise<void> {
  console.log("clean all the notifications");
  try {
    const center = await new Workbench().openNotificationsCenter();
    await center.getDriver().sleep(500);
    await center.clearAllNotifications();
    console.log("clean all the notifications done");
  } catch (error) {
    console.log("clean all the notifications failed");
  }
}

export async function takeNotificationAction(
  notificationMessage: string,
  actionText: string
): Promise<boolean> {
  const driver = VSBrowser.instance.driver;
  const index = 0;
  return await RetryHandler.retry(async () => {
    const center = await new Workbench().openNotificationsCenter();
    await center.getDriver().sleep(500);
    const notifications = await center.getNotifications(NotificationType.Any);
    for (const notification of notifications) {
      const message = await notification.getMessage();
      if (message.includes(notificationMessage)) {
        notification.takeAction(actionText);
        return true;
      }
    }
    return false;
  });
}

export async function execCommandIfExistFromTreeView(
  commandName: string,
  timeout?: number
): Promise<boolean> {
  const driver = VSBrowser.instance.driver;
  const index = 0;
  return await RetryHandler.retry(async () => {
    const activityBar = new ActivityBar();
    const control = await activityBar.getViewControl(Extension.displayName);
    await control?.openView();
    await driver.sleep(Timeout.shortTimeLoading);
    const view = new SideBarView();
    const btn = await view.findElement(By.linkText(commandName));
    await btn.click();
    return false;
  });
}

export async function grainNgrokAuth(testFolder: string) {
  console.log("grain ngrok auth");
  const command = `npx ngrok authtoken ${Env.ngrokToken}`;
  console.log(command);
  try {
    const { stdout } = await execCommand(testFolder, command);
    console.log(stdout);
  } catch (error) {
    assert.fail(error as string);
  }
}

export async function openTerminalView(): Promise<void> {
  const driver = VSBrowser.instance.driver;
  await driver.wait(async () => {
    await VSBrowser.instance.waitForWorkbench();

    await execCommandIfExist("Terminal: Create New Terminal");
    await driver.sleep(6000);
    let terminalView;
    try {
      const bottomBarPanel = new BottomBarPanel();
      terminalView = await new TerminalView(bottomBarPanel).wait();
    } catch (err) {
      // ignore error
      terminalView = undefined;
    }

    return terminalView !== undefined;
  }, Timeout.command);
}

export async function execCommandWithCLI(command: string): Promise<string> {
  const driver = VSBrowser.instance.driver;
  let terminalView: TerminalView | undefined;
  let bottomBarPanel: BottomBarPanel | undefined;
  let text = "";
  await VSBrowser.instance.waitForWorkbench();
  await execCommandIfExist("Terminal: Create New Terminal");
  await driver.sleep(6000);
  try {
    bottomBarPanel = new BottomBarPanel();
    terminalView = new TerminalView(bottomBarPanel);
    await terminalView.wait(Timeout.shortTimeWait);
    await terminalView.executeCommand(command);
    text = await terminalView.getText();
  } catch (err) {
    // ignore error
    terminalView = undefined;
  }
  try {
    await terminalView?.killTerminal();
  } catch (error) {
    // ignore error
  }
  return text;
}

async function selectQuickPick(tag: string): Promise<boolean> {
  const driver = VSBrowser.instance.driver;
  const input = await InputBox.create();
  const quickPick = await input.findQuickPick(tag);
  if (!quickPick) {
    return false;
  }
  await quickPick.select();
  driver.sleep(Timeout.input);
  return true;
}

async function selectQuickPickWithWord(word: string): Promise<boolean> {
  const driver = VSBrowser.instance.driver;
  const input = await InputBox.create();
  const quickPicks = await input.getQuickPicks();
  for (const quickPick of quickPicks) {
    const tagName = await quickPick.getText();
    if (tagName.includes(word)) {
      console.log(`[Select quick pick]: ${tagName}.`);
      await quickPick.select();
      await driver.sleep(Timeout.input);
      return true;
    }
  }
  return false;
}

async function selectQuickPickWithRegex(regex: RegExp): Promise<boolean> {
  const driver = VSBrowser.instance.driver;
  const input = await InputBox.create();
  const quickPicks = await input.getQuickPicks();
  for (const quickPick of quickPicks) {
    const text = await quickPick.getText();
    if (regex.test(text)) {
      await quickPick.select();
      await driver.sleep(Timeout.input);
      return true;
    }
  }

  return false;
}

// Set folder path in the input box
async function inputFolderPath(
  driver: WebDriver,
  input: InputBox,
  folder: string
) {
  while (true) {
    // input may be auto-corrected to other value, so set until it's fixed
    await input.setText(folder);
    const text = await input.getText();
    if (text === folder) {
      break;
    }
    await driver.sleep(Timeout.input);

    if (isWsl && (await setInputTextWsl(driver, input, folder))) {
      break;
    }
  }
}

async function setInputTextWsl(
  driver: WebDriver,
  input: InputBox,
  path: string
): Promise<boolean> {
  // The auto-correct box on WSL is different from Windows and Linux and backslashes in input.setText() doesn't work.
  // Use scripts to workaround it.
  const sourceCode = `
        const [element, folder] = arguments; 
        const input = element.querySelector("input.input"); 
        if (input) { 
            input.value = folder; 
            return undefined;
        } else { 
            return "input.input not found"; 
        };
    `;
  const result = await driver.executeScript(sourceCode, input, path);
  if (result != undefined) {
    console.log(result);
  }
  // Setting the input.value itself doesn't work. So input an extra space to trigger the handlers.
  await input.sendKeys(" ");
  await input.sendKeys(Key.BACK_SPACE);
  const text = await input.getText();
  // trim right space
  return text.substring(0, text.length) === path;
}

export async function createNewProject(
  option: OptionType,
  appName: string,
  lang?: "JavaScript" | "TypeScript",
  testRootFolder?: string,
  appNameCopySuffix = "copy"
): Promise<void> {
  const driver = VSBrowser.instance.driver;
  let scaffoldingTime = 60 * 1000;
  if (!testRootFolder) {
    testRootFolder = path.resolve(__dirname, "../../resource/");
  }
  await execCommandIfExist(
    CommandPaletteCommands.CreateProjectCommand,
    Timeout.webView
  );
  console.log("Create new project: ", appName);
  const input = await InputBox.create();
  // if exist click it
  switch (option) {
    case "tabnsso": {
      await input.selectQuickPick(CreateProjectQuestion.Tab);
      await input.selectQuickPick("Basic Tab");
      await driver.sleep(Timeout.input);
      // Choose programming language
      if (lang) {
        await input.selectQuickPick(lang);
      } else {
        await input.selectQuickPick("JavaScript");
      }
      break;
    }
    case "tab": {
      await input.selectQuickPick(CreateProjectQuestion.Tab);
      await input.selectQuickPick("React with Fluent UI");
      await driver.sleep(Timeout.input);
      // Choose programming language
      if (lang) {
        await input.selectQuickPick(lang);
      } else {
        await input.selectQuickPick("JavaScript");
      }
      break;
    }
    case "bot": {
      await input.selectQuickPick(CreateProjectQuestion.Bot);
      await input.selectQuickPick("Basic Bot");
      await driver.sleep(Timeout.input);
      // Choose programming language
      if (lang) {
        await input.selectQuickPick(lang);
      } else {
        await input.selectQuickPick("JavaScript");
      }
      break;
    }
    case "crbot": {
      await input.selectQuickPick(CreateProjectQuestion.Bot);
      await input.selectQuickPick("Chat Command");
      await driver.sleep(Timeout.input);
      // Choose programming language
      if (lang) {
        await input.selectQuickPick(lang);
      } else {
        await input.selectQuickPick("JavaScript");
      }
      break;
    }
    case "funcnoti": {
      await input.selectQuickPick(CreateProjectQuestion.Bot);
      await input.selectQuickPick("Chat Notification Message");
      await driver.sleep(Timeout.input);

      // Select trigger
      // Unselect restify http trigger
      // await selectQuickPickWithRegex(/(HTTP Trigger.*Restify Server)|(Restify Server.*HTTP Trigger)/);
      // Select Functions http trigger
      await selectQuickPickWithRegex(
        /(HTTP Trigger.*Azure Functions)|(Azure Functions.*HTTP Trigger)/
      );
      await driver.sleep(Timeout.input);
      // Choose programming language
      if (lang) {
        await input.selectQuickPick(lang);
      } else {
        await input.selectQuickPick("JavaScript");
      }
      break;
    }
    case "restnoti": {
      await input.selectQuickPick(CreateProjectQuestion.Bot);
      await input.selectQuickPick("Chat Notification Message");
      await driver.sleep(Timeout.input);
      // Select trigger
      // HTTP Trigger Azure Restify, the default is Restify http trigger, no action needed.
      await input.confirm();

      // Choose programming language
      if (lang) {
        await input.selectQuickPick(lang);
      } else {
        await input.selectQuickPick("JavaScript");
      }
      break;
    }
    case "msg": {
      await input.selectQuickPick(CreateProjectQuestion.MessageExtension);
      await input.selectQuickPick("Collect Form Input and Process Data");
      await driver.sleep(Timeout.input);
      // Choose programming language
      if (lang) {
        await input.selectQuickPick(lang);
      } else {
        await input.selectQuickPick("JavaScript");
      }
      break;
    }
    case "msgsa": {
      await input.selectQuickPick(CreateProjectQuestion.MessageExtension);
      await input.selectQuickPick("Custom Search Results");
      await driver.sleep(Timeout.input);
      // Choose programming language
      if (lang) {
        await input.selectQuickPick(lang);
      } else {
        await input.selectQuickPick("JavaScript");
      }
      break;
    }
    case "m365lp": {
      await input.selectQuickPick(CreateProjectQuestion.Tab);
      await input.selectQuickPick("React with Fluent UI");
      await driver.sleep(Timeout.input);
      // Choose programming language
      if (lang) {
        await input.selectQuickPick(lang);
      } else {
        await input.selectQuickPick("JavaScript");
      }
      break;
    }
    case "spfxreact": {
      scaffoldingTime = 7 * 60 * 1000;
      await input.selectQuickPick(CreateProjectQuestion.Tab);
      await driver.sleep(Timeout.input);
      await input.selectQuickPick("SPFx");
      await driver.sleep(Timeout.input);
      await input.selectQuickPick(CreateProjectQuestion.CreateNewSpfxSolution);
      // Wait for Node version check
      await driver.sleep(Timeout.longTimeWait);
      await input.selectQuickPick(
        CreateProjectQuestion.SpfxSharepointFrameworkInTtk
      );
      await driver.sleep(Timeout.input);
      // Choose React or None
      await input.selectQuickPick("React");
      // Input Web Part Name
      await input.setText(appName);
      await driver.sleep(Timeout.input);
      await input.confirm();
      // Input Web Part Description
      await driver.sleep(Timeout.input);
      break;
    }
    case "spfxnone": {
      scaffoldingTime = 7 * 60 * 1000;
      // Choose Tab(SPFx)
      await input.selectQuickPick(CreateProjectQuestion.Tab);
      await driver.sleep(Timeout.input);
      await input.selectQuickPick("SPFx");
      await driver.sleep(Timeout.input);
      await input.selectQuickPick(CreateProjectQuestion.CreateNewSpfxSolution);
      // Wait for Node version check
      await driver.sleep(Timeout.longTimeWait);
      await input.selectQuickPick(
        CreateProjectQuestion.SpfxSharepointFrameworkInTtk
      );
      await driver.sleep(Timeout.input);
      // Choose React or None
      await input.selectQuickPick("None");
      // Input Web Part Name
      await input.setText(appName);
      await driver.sleep(Timeout.input);
      await input.confirm();
      // Input Web Part Description
      await driver.sleep(Timeout.input);
      break;
    }
    case "spfxmin": {
      scaffoldingTime = 5 * 60 * 1000;
      // Choose Tab(SPFx)
      await input.selectQuickPick(CreateProjectQuestion.Tab);
      await driver.sleep(Timeout.input);
      await input.selectQuickPick("SPFx");
      await driver.sleep(Timeout.input);
      await input.selectQuickPick(CreateProjectQuestion.CreateNewSpfxSolution);
      // Wait for Node version check
      await driver.sleep(Timeout.longTimeWait);
      await input.selectQuickPick(
        CreateProjectQuestion.SpfxSharepointFrameworkInTtk
      );
      await driver.sleep(Timeout.input);
      // Choose React or None
      await input.selectQuickPick("Minimal");
      // Input Web Part Name
      await input.setText(appName);
      await driver.sleep(Timeout.input);
      await input.confirm();
      // Input Web Part Description
      await driver.sleep(Timeout.input);
      break;
    }
    case "dashboard": {
      // Choose Dashboard Tab
      // A/B test
      // await input.selectQuickPick('Embed a dashboard canvas in Teams');
      await input.selectQuickPick(CreateProjectQuestion.Tab);
      await input.selectQuickPick("Dashboard");
      await driver.sleep(Timeout.input);
      // Choose programming language
      if (lang) {
        await input.selectQuickPick(lang);
      } else {
        await input.selectQuickPick("JavaScript");
      }
      break;
    }
    case "workflow": {
      await input.selectQuickPick(CreateProjectQuestion.Bot);
      await input.selectQuickPick("Sequential Workflow in Chat");
      await driver.sleep(Timeout.input);
      // Choose programming language
      if (lang) {
        await input.selectQuickPick(lang);
      } else {
        await input.selectQuickPick("JavaScript");
      }
      break;
    }
    case "timenoti": {
      await input.selectQuickPick(CreateProjectQuestion.Bot);
      await input.selectQuickPick("Chat Notification Message");
      await driver.sleep(Timeout.input);
      await selectQuickPickWithRegex(
        /(Timer Trigger.*Azure Functions)|(Azure Functions.*Timer Trigger)/
      );
      await driver.sleep(Timeout.input);
      // Choose programming language
      if (lang) {
        await input.selectQuickPick(lang);
      } else {
        await input.selectQuickPick("JavaScript");
      }
      break;
    }
    case "functimernoti": {
      await input.selectQuickPick(CreateProjectQuestion.Bot);
      await input.selectQuickPick("Chat Notification Message");
      await driver.sleep(Timeout.input);
      await selectQuickPickWithRegex(
        /(HTTP and Timer Trigger.*Azure Functions)|(Azure Functions.*HTTP and Timer Trigger)/
      );
      await driver.sleep(Timeout.input);
      // Choose programming language
      if (lang) {
        await input.selectQuickPick(lang);
      } else {
        await input.selectQuickPick("JavaScript");
      }
      break;
    }
    case "addin": {
      await input.selectQuickPick(CreateProjectQuestion.OfficeAddin);
      await input.selectQuickPick("Taskpane");
      await driver.sleep(Timeout.input);
      break;
    }
    case "importaddin": {
      const importPath: string =
        testRootFolder + "\\..\\src\\ui-test\\treeview\\office-xml-addin";
      await input.selectQuickPick(CreateProjectQuestion.OfficeAddin);
      await input.selectQuickPick("Import an Existing Outlook Add-in");

      console.log("choose import path: ", importPath);
      await input.selectQuickPick("Browse...");
      await inputFolderPath(driver, input, importPath);
      await driver.sleep(Timeout.input);
      await input.confirm();

      console.log("choose manifest path: ", "manifest.xml");
      await input.selectQuickPick("Browse...");
      await inputFolderPath(driver, input, importPath + "\\manifest.xml");
      await driver.sleep(Timeout.input);
      await input.confirm();
      break;
    }
    default:
      break;
  }

  // Input folder path
  console.log("choose project path: ", testRootFolder);
  await input.selectQuickPick("Browse...");
  await inputFolderPath(driver, input, testRootFolder);
  await input.confirm();

  // Input App Name
  console.log("input appName: ", appName);
  await input.setText(appName);
  await driver.sleep(Timeout.input);
  await input.confirm();

  await driver.sleep(scaffoldingTime);

  const projectPath = path.resolve(testRootFolder, appName);
  const projectCopyPath = path.resolve(
    testRootFolder,
    appName + appNameCopySuffix
  );
  console.log("copy path: ", projectPath, " to: ", projectCopyPath);
  await fs.mkdir(projectCopyPath);
  await fs.copy(projectPath, projectCopyPath);
  console.log("open project path");
  await openExistingProject(projectCopyPath);
}

export async function setExtensionSetting(
  category: string,
  settingName: string,
  value: any
): Promise<void> {
  const settingsEditor = await new Workbench().openSettings();
  const setting = await settingsEditor.findSetting(settingName, category);
  const currentValue = await setting.getValue();
  await setting.setValue(value);
}

export async function setInsiderPreview(): Promise<void> {
  await setExtensionSetting(
    Extension.settingsCategory,
    Extension.settingsInsiderPreview,
    true
  );
  await execCommandIfExist("Developer: Reload Window", Timeout.webView);
}

export async function resetInsiderPreview(): Promise<void> {
  await setExtensionSetting(
    Extension.settingsCategory,
    Extension.settingsInsiderPreview,
    false
  );
  await execCommandIfExist("Developer: Reload Window", Timeout.webView);
}

export async function runDeployAadAppManifest(env = "dev"): Promise<void> {
  await execCommandIfExist(
    CommandPaletteCommands.DeployAadAppManifestCommand,
    Timeout.webView
  );
  const driver = VSBrowser.instance.driver;
  await driver.sleep(Timeout.longTimeWait);
  const input = await InputBox.create();
  await input.selectQuickPick("aad.manifest.json");
  await driver.sleep(Timeout.input);
  await input.selectQuickPick(env);
  await driver.sleep(Timeout.shortTimeWait);
}

export async function installTTK(version: string, V3: boolean): Promise<void> {
  if (V3) {
    process.env["TEAMSFX_V3"] = "true";
    process.env["TEAMSFX_V3_MIGRATION"] = "true";
  } else {
    process.env["TEAMSFX_V3"] = "false";
    process.env["TEAMSFX_V3_MIGRATION"] = "false";
  }
  await execCommandIfExist(CommandPaletteCommands.InstallTTK, Timeout.webView);
  const input = await InputBox.create();
  await input.selectQuickPick(Extension.displayName);
  const driver = VSBrowser.instance.driver;
  await driver.sleep(Timeout.shortTimeWait);
  await input.selectQuickPick(version);
  await driver.sleep(Timeout.longTimeWait);
  const sidebar = await driver.findElement(By.id("workbench.parts.sidebar"));

  const items = await sidebar.findElements(By.className("monaco-list-row"));

  for (const item of items) {
    const name = await item.findElement(By.className("name")).getText();
    if (name === Extension.displayName) {
      const actions = await item.findElements(By.className("action-item"));
      for (const action of actions) {
        const reloadBtn = await action.getText();
        if (reloadBtn === "Reload Required") {
          await action.click();
          await driver.sleep(Timeout.shortTimeWait);
          return;
        }
      }
    }
  }
}

export async function validateNotification(text: string): Promise<void> {
  console.log("open notifications");
  try {
    const center = await new Workbench().openNotificationsCenter();
    await center.getDriver().sleep(Timeout.shortTimeLoading);
    const notis = await center.findElements(By.className("monaco-list-row"));
    for (const noti of notis) {
      const notiText = await noti.getText();
      if (notiText.includes(text)) {
        console.log("[success] notification found: ", notiText);
        return;
      }
    }
    await VSBrowser.instance.takeScreenshot(
      getScreenshotName("upgradeNotification")
    );
    assert.fail("[error] Cannot find notification: " + text);
  } catch (error) {
    await VSBrowser.instance.takeScreenshot(
      getScreenshotName("upgradeNotification")
    );
    assert.fail("[error] Cannot find notification: " + text);
  }
}

export async function upgrade() {
  console.log("Upgrade...");
  const driver = VSBrowser.instance.driver;
  await driver.sleep(Timeout.shortTimeLoading);
  const dialog = await driver.findElement(By.className("monaco-dialog-box"));
  const btns = await dialog.findElements(By.className("monaco-text-button"));
  for (const btn of btns) {
    const text = await btn.getText();
    if (text === "Upgrade") {
      await btn.click();
      await driver.sleep(Timeout.shortTimeLoading);
      console.log("[success] Upgrad finished !!!");
      return;
    }
  }
  await VSBrowser.instance.takeScreenshot(
    getScreenshotName("upgradeNotification")
  );
  assert.fail("[error] Cannot find upgrade button.");
}

export async function upgradeByCommandPalette() {
  console.log("Upgrade...");
  await execCommandIfExist(CommandPaletteCommands.UpgradeProjectCommand);
  const driver = VSBrowser.instance.driver;
  await driver.sleep(Timeout.shortTimeLoading);
  console.log("[success] Upgrad finished !!!");
}

export async function upgradeByTreeView() {
  console.log("Upgrade using treeView...");
  const driver = VSBrowser.instance.driver;
  await driver.sleep(Timeout.shortTimeLoading);
  await execCommandIfExistFromTreeView("Upgrade Project");
  await driver.sleep(Timeout.shortTimeLoading);
  try {
    const dialog = await driver.findElement(By.className("monaco-dialog-box"));
    const btns = await dialog.findElements(By.className("monaco-text-button"));
    for (const btn of btns) {
      const text = await btn.getText();
      if (text === "OK") {
        await btn.click();
        await driver.sleep(Timeout.shortTimeLoading);
      }
    }
    assert.fail("[error] Cannot find upgrade button.");
  } catch (error) {}
  console.log("[success] Upgrad finished !!!");
}

export async function validateUpgrade() {
  console.log("Validate upgrade...");
  const editorView = new EditorView();
  const driver = VSBrowser.instance.driver;
  await driver.sleep(Timeout.shortTimeLoading);
  const titles = await editorView.getOpenEditorTitles();
  for (const title of titles) {
    if (title === "Preview upgradeReport.md") {
      console.log("[success] Upgrade successfully !!!");
      return;
    }
  }
  await VSBrowser.instance.takeScreenshot(
    getScreenshotName("upgradeNotification")
  );
  assert.fail("[error] Cannot find upgrade report.");
}

export async function findWordFromTerminal(word: string): Promise<boolean> {
  let searchInput: WebElement;
  let closeBtn: WebElement;
  let result: string;
  console.log("verify start ...");
  await execCommandIfExist("Terminal: Focus Find");
  const searchBoxs = await VSBrowser.instance.driver.findElements(
    By.css(".simple-find-part")
  );
  for (const searchBox of searchBoxs) {
    try {
      searchInput = await searchBox.findElement(By.className("input"));
      closeBtn = await searchBox.findElement(By.css(".codicon-widget-close"));
      await searchInput.clear();
      await searchInput.sendKeys("Failed ");
      console.log("send key: Failed");
    } catch (error) {
      console.log("[Pending]: Input error, try to find next...");
      continue;
    }
    await VSBrowser.instance.driver.sleep(Timeout.webView);

    // verify error message
    result = await (
      await searchBox.findElement(By.className("matchesCount"))
    ).getText();
    if (result.includes("No results")) {
      console.log("no error message found.");

      // verify success message
      await searchInput.clear();
      await searchInput.sendKeys(word);
      console.log("send key: ", word);
      await VSBrowser.instance.driver.sleep(Timeout.webView);
      result = await (
        await searchBox.findElement(By.className("matchesCount"))
      ).getText();
      if (result.includes("No results") == false) {
        console.log("[Pass]: verify " + word + " success !!!");
        return true;
      }
    } else {
      await VSBrowser.instance.takeScreenshot(
        getScreenshotName("debug failed")
      );
      assert.fail("[failed] error message found !!!");
    }
  }
  return false;
}

export async function getOutPutError(): Promise<void> {
  const center = await new Workbench().openNotificationsCenter();
  await center.getDriver().sleep(3000);
  const notifications = await center.getNotifications(NotificationType.Any);
  for (const notification of notifications) {
    const message = await notification.getMessage();
    if (
      message.includes("Error:") ||
      message.includes("Error]:") ||
      message.includes("Failed]: ")
    ) {
      await VSBrowser.instance.takeScreenshot(
        getScreenshotName("output error")
      );
      assert.fail(`[Error]: Get error message: ${message}`);
    }
  }
  console.log("[Notification]: No error message found.");
}
