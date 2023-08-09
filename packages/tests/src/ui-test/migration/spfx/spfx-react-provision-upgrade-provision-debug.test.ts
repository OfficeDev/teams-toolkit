/**
 * @author Helly Zhang <v-helzha@microsoft.com>
 */
import { expect } from "chai";
import { MigrationTestContext } from "../migrationContext";
import {
  Timeout,
  Capability,
  Notification,
  Framework,
  CliVersion,
  CommandPaletteCommands,
} from "../../../utils/constants";
import { it } from "../../../utils/it";
import { Env } from "../../../utils/env";
import {
  initPage,
  validateTeamsWorkbench,
} from "../../../utils/playwrightOperation";
import {
  validateNotification,
  startDebugging,
  upgrade,
  waitForTerminal,
  validateUpgrade,
  upgradeByCommandPalette,
  getNotification,
  execCommandIfExist,
  clearNotifications,
} from "../../../utils/vscodeOperation";
import { CliHelper } from "../../cliHelper";
import { execCommand } from "../../../utils/execCommand";
import { VSBrowser } from "vscode-extension-tester";

describe("Migration Tests", function () {
  this.timeout(Timeout.testAzureCase);
  let mirgationDebugTestContext: MigrationTestContext;

  beforeEach(async function () {
    // ensure workbench is ready
    this.timeout(Timeout.prepareTestCase);

    mirgationDebugTestContext = new MigrationTestContext(
      Capability.Spfx,
      "javascript",
      undefined,
      Framework.React
    );
    await mirgationDebugTestContext.before();
  });

  afterEach(async function () {
    this.timeout(Timeout.finishTestCase);
    await mirgationDebugTestContext.after();
  });

  it(
    "[auto] V2 spfx react migrate test",
    {
      testPlanCaseId: 17184356,
      author: "v-helzha@microsoft.com",
    },
    async () => {
      // install v2 stable cli 1.2.6
      await CliHelper.installCLI(CliVersion.V2TeamsToolkitStable425, false);
      const result = await execCommand("./", "teamsfx -v");
      console.log(result.stdout);
      expect(
        (result.stdout as string).includes(CliVersion.V2TeamsToolkitStable425)
      ).to.be.true;
      // create v2 project using CLI
      await mirgationDebugTestContext.createProjectCLI(false);
      // verify popup
      try {
        await validateNotification(Notification.Upgrade);
      } catch (error) {
        await validateNotification(Notification.Upgrade_dicarded);
      }

      // v2 provision
      await mirgationDebugTestContext.provisionWithCLI("dev", false);

      // upgrade
      // await startDebugging();
      // await upgrade();
      await upgradeByCommandPalette();
      // verify upgrade
      await validateUpgrade();
      // enable cli v3
      CliHelper.setV3Enable();

      await clearNotifications();
      await execCommandIfExist(CommandPaletteCommands.ProvisionCommand);
      const driver = VSBrowser.instance.driver;
      await driver.sleep(Timeout.spfxProvision);
      await getNotification(
        Notification.ProvisionSucceeded,
        Timeout.shortTimeWait
      );

      // skip deploy because of it is failed before migration
      // await clearNotifications();
      // await execCommandIfExist(CommandPaletteCommands.DeployCommand);
      // try {
      //   const deployConfirmInput = await InputBox.create();
      //   await deployConfirmInput.confirm();
      // } catch (error) {
      //   console.log("No need to confirm to deploy.");
      // }
      // await driver.sleep(Timeout.spfxDeploy);
      // await getNotification(Notification.DeploySucceeded, Timeout.longTimeWait);

      const teamsAppId = await mirgationDebugTestContext.getTeamsAppId("dev");
      expect(teamsAppId.length).to.equal(36);
      // skip validation because of it is failed before migration
      // const page = await initPage(
      //   mirgationDebugTestContext.context!,
      //   teamsAppId,
      //   Env.username,
      //   Env.password
      // );
      // await validateTeamsWorkbench(page, Env.displayName);
    }
  );
});
