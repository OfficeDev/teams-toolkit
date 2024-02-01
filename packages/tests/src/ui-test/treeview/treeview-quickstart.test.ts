/**
 * @author Helly Zhang <v-helzha@microsoft.com>
 */
import { By, EditorView, VSBrowser, WebView } from "vscode-extension-tester";
import { expect } from "chai";
import { execCommandIfExist } from "../../utils/vscodeOperation";
import { TreeViewTestContext } from "./treeviewContext";
import { CommandPaletteCommands, Timeout } from "../../utils/constants";
import { delay } from "../../utils/retryHandler";
import { it } from "../../utils/it";

describe("Openning Quick Start Tests", function () {
  this.timeout(Timeout.testCase);
  let treeViewTestContext: TreeViewTestContext;

  beforeEach(async function () {
    // ensure workbench is ready
    this.timeout(Timeout.prepareTestCase);
    treeViewTestContext = new TreeViewTestContext("treeview");
    await treeViewTestContext.before();
  });

  afterEach(async function () {
    this.timeout(Timeout.finishTestCase);
    await treeViewTestContext.after();
  });

  it(
    "[auto] [QuickStart] Check contents",
    {
      testPlanCaseId: 12933026,
      author: "v-helzha@microsoft.com",
    },
    async function () {
      const driver = VSBrowser.instance.driver;
      await driver.sleep(Timeout.reloadWindow);
      await new EditorView().closeAllEditors();
      await execCommandIfExist(
        CommandPaletteCommands.QuickStartCommand,
        Timeout.webView
      );
      const webView = new WebView();

      const element = await webView.findWebElement(
        By.className("category-description-container")
      );
      const text = await element.getText();
      expect(text).has.string("Get Started with Teams Toolkit");

      let button = await getExpandedButton(
        webView,
        false,
        "Get your environment ready"
      );
      const item = await button.findElement(By.css("h3"));
      const itemContext = await item.getText();
      expect(itemContext).has.string("Get your environment ready");
      const button1 = await button?.findElement(
        By.css(".button-container .monaco-button")
      );
      const text1 = await button1.getText();
      expect(text1).has.string("Run Prerequisite Checker");
      console.log('Found the button "Run Prerequisite Checker"');
      button = await getExpandedButton(webView, false, "Build your first app");
      const button2 = await button?.findElement(
        By.css(".button-container .monaco-button")
      );
      const text2 = await button2.getText();
      expect(text2).has.string("Create a New App");
      console.log('Found the button "Create a new app"');
    }
  );
});

async function getExpandedButton(
  webView: WebView,
  expended = true,
  content = "Build your first app"
) {
  if (!expended) {
    const collapsedButtons = await webView.findWebElements(
      By.xpath('//button[@class="getting-started-step"]')
    );
    await delay(Timeout.shortTimeWait);
    for (const button of collapsedButtons) {
      const item = await button.findElement(By.css("h3"));
      const itemContext = await item.getText();
      if (itemContext.includes(content)) {
        await button.click();
        await delay(Timeout.shortTimeWait);
        break;
      }
    }
  }
  const button = await webView.findWebElement(
    By.xpath('//button[@class="getting-started-step expanded"]')
  );
  return button;
}
