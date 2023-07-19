import { execCommandIfExist } from "./vscodeOperation";
import { ModalDialog, InputBox, VSBrowser } from "vscode-extension-tester";
import { CommandPaletteCommands, Timeout, TestFilePath } from "./constants";

export async function upgradeV2ToV3() {
  console.log("start to upgrade the project");
  await execCommandIfExist(CommandPaletteCommands.UpgradeProjectCommand);
  const driver = VSBrowser.instance.driver;
  await driver.sleep(Timeout.shortTimeWait);
  const dialog = new ModalDialog();
  console.log("click upgrade button");
  await dialog.pushButton("Upgrade");
  await driver.sleep(Timeout.shortTimeLoading);
  const waitTime = Timeout.shortTimeLoading;
  await driver.sleep(waitTime);
}
