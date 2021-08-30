import { AxiosInstance, AxiosResponse, default as axios } from "axios";
import * as path from "path";
import * as os from "os";
import {
  ConfigFolderName,
  LogProvider,
  SolutionContext,
  SystemError,
  TelemetryReporter,
} from "@microsoft/teamsfx-api";
import * as fs from "fs-extra";
import { cpUtils } from "./cpUtils";
import { finished, Readable, Writable } from "stream";
import {
  defaultHelpLink,
  DepsCheckerEvent,
  isMacOS,
  isWindows,
  Messages,
  TelemetryMeasurement,
  TelemtryMessages,
} from "./common";
import {
  SolutionTelemetryComponentName,
  SolutionTelemetryProperty,
  SolutionTelemetrySuccess,
} from "../../constants";

import { performance } from "perf_hooks";
import { sendErrorTelemetryThenReturnError } from "../util";
import { isBicepEnvCheckerEnabled } from "../../../../../common/tools";

export const BicepName = "Bicep";
export const installVersion = "v0.4";
export const supportedVersions: Array<string> = [installVersion];

const displayBicepName = `${BicepName} (${installVersion})`;
const timeout = 5 * 60 * 1000;
const source = "bicep-envchecker";

export async function checkBicep(ctx: SolutionContext): Promise<string> {
  const bicepChecker = new BicepChecker(ctx.logProvider, ctx.telemetryReporter);
  try {
    if (bicepChecker.isEnabled() && !bicepChecker.isInstalled()) {
      bicepChecker.install();
    }
  } catch (err) {
    await ctx.logProvider?.debug(`Failed to check or install bicep, error = '${err}'`);
    await displayLearnMore(err.message, defaultHelpLink, ctx); // TODO: stop continue
  }
  return bicepChecker.getBicepCommand();
}

class BicepChecker {
  private readonly _logger: LogProvider | undefined;
  private readonly _telemetry: TelemetryReporter | undefined;
  private readonly _axios: AxiosInstance;

  constructor(logger?: LogProvider, telemetry?: TelemetryReporter) {
    this._logger = logger;
    this._telemetry = telemetry;
    this._axios = axios.create({
      headers: { "content-type": "application/json" },
    });
  }

  public async isEnabled(): Promise<boolean> {
    const isBicepEnabled = isBicepEnvCheckerEnabled();
    if (!isBicepEnabled) {
      this._telemetry?.sendTelemetryEvent(DepsCheckerEvent.bicepCheckSkipped, getCommonProps());
    }
    return isBicepEnabled;
  }

  public async isInstalled(): Promise<boolean> {
    const isGlobalBicepInstalled: boolean = await this.isBicepInstalled("bicep");
    const isPrivateBicepInstalled: boolean = await this.isBicepInstalled(this.getBicepExecPath());

    if (isGlobalBicepInstalled) {
      this._telemetry?.sendTelemetryEvent(DepsCheckerEvent.bicepAlreadyInstalled, getCommonProps());
    }
    if (isPrivateBicepInstalled) {
      // always install private bicep even if global bicep exists.
      this._telemetry?.sendTelemetryEvent(DepsCheckerEvent.bicepInstallCompleted, getCommonProps());
      return true;
    }
    return false;
  }

  public async install(): Promise<void> {
    await this.cleanup();

    await this.installBicep();

    if (!(await this.validate())) {
      await this.handleInstallFailed();
    }
    await this.handleInstallCompleted();
  }

  private async cleanup() {
    try {
      await fs.emptyDir(this.getBicepInstallDir());
    } catch (err) {
      await this._logger?.debug(
        `Failed to clean up path: ${this.getBicepInstallDir()}, error: ${err}`
      );
    }
  }

  private async installBicep(): Promise<void> {
    try {
      const start = performance.now();
      await runWithProgressIndicator(async () => await this.doInstallBicep(), this._logger);
      this._telemetry?.sendTelemetryEvent(
        DepsCheckerEvent.bicepInstallScriptCompleted,
        getCommonProps(),
        {
          [TelemetryMeasurement.completionTime]: Number(
            ((performance.now() - start) / 1000).toFixed(2)
          ),
        }
      );
    } catch (err) {
      sendSystemErrorEvent(
        DepsCheckerEvent.bicepInstallScriptError,
        TelemtryMessages.failedToInstallBicep,
        err,
        this._telemetry
      );
      await this._logger?.error(
        `${Messages.failToInstallBicep
          .split("@NameVersion")
          .join(displayBicepName)}, error = '${err}'`
      );
    }
  }

  private async doInstallBicep(): Promise<void> {
    const response: AxiosResponse<Array<{ tag_name: string }>> = await this._axios.get(
      "https://api.github.com/repos/Azure/bicep/releases",
      {
        headers: { Accept: "application/vnd.github.v3+json" },
      }
    );
    const selectedVersion: string = response.data
      .map((t) => t.tag_name)
      .filter(this.isVersionSupported)
      .sort((v1, v2) => v2.localeCompare(v1))[0];
    const installDir = this.getBicepExecPath();

    await this._logger?.info(
      Messages.downloadBicep
        .replace("@NameVersion", `Bicep ${selectedVersion}`)
        .replace("@InstallDir", installDir)
    );
    const axiosResponse = await this._axios.get(
      `https://github.com/Azure/bicep/releases/download/${selectedVersion}/${this.getBicepBitSuffixName()}`,
      {
        timeout: timeout,
        timeoutErrorMessage: "Failed to download bicep by http request timeout",
        responseType: "stream",
      }
    );

    const bicepReader: Readable = axiosResponse.data;
    const bicepWriter: Writable = fs.createWriteStream(installDir);
    try {
      await this.writeBicepBits(bicepWriter, bicepReader);
      fs.chmodSync(installDir, 0o755);
    } finally {
      await this.closeStream(bicepWriter);
    }
  }

  private async writeBicepBits(writer: Writable, reader: Readable): Promise<void> {
    return new Promise((resolve: (value: void) => void, reject: (e: Error) => void): void => {
      reader.pipe(writer);
      finished(writer, (err?: NodeJS.ErrnoException | null) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  private async closeStream(writer: Writable): Promise<void> {
    return new Promise((resolve: (value: void) => void): void => {
      writer.end(() => resolve());
    });
  }

  private async validate(): Promise<boolean> {
    let isVersionSupported = false;
    let privateVersion = "";
    try {
      privateVersion = await this.queryVersion(this.getBicepExecPath());
      isVersionSupported = this.isVersionSupported(privateVersion);
    } catch (err) {
      sendSystemErrorEvent(
        DepsCheckerEvent.bicepValidationError,
        TelemtryMessages.failedToValidateBicep,
        err,
        this._telemetry
      );
      await this._logger?.error(`${TelemtryMessages.failedToValidateBicep}, error = ${err}`);
    }

    if (!isVersionSupported) {
      this._telemetry?.sendTelemetryEvent(DepsCheckerEvent.bicepValidationError, {
        ...{ "bicep-private-version": privateVersion },
        ...getCommonProps(),
      });
    }

    return isVersionSupported;
  }

  private async handleInstallCompleted() {
    this._telemetry?.sendTelemetryEvent(DepsCheckerEvent.bicepInstallCompleted);
    await this._logger?.info(Messages.finishInstallBicep.replace("@NameVersion", displayBicepName));
  }

  private async handleInstallFailed(): Promise<void> {
    await this.cleanup();
    this._telemetry?.sendTelemetryEvent(DepsCheckerEvent.bicepInstallError);
    throw new SystemError(
      DepsCheckerEvent.bicepInstallError,
      Messages.failToInstallBicep.split("@NameVersion").join(displayBicepName),
      source
    );
  }

  private isVersionSupported(version: string): boolean {
    return supportedVersions.some((supported) => version.includes(supported));
  }

  private async isBicepInstalled(path: string): Promise<boolean> {
    try {
      const version = await this.queryVersion(path);
      return this.isVersionSupported(version);
    } catch (e) {
      // do nothing
      return false;
    }
  }

  public async getBicepCommand(): Promise<string> {
    if (await this.isInstalled()) {
      return this.getBicepExecPath();
    }
    return "bicep";
  }

  private getBicepExecPath(): string {
    return path.join(this.getBicepInstallDir(), this.getBicepFileName());
  }

  private getBicepFileName(): string {
    if (isWindows()) {
      return "bicep.exe";
    }
    return "bicep";
  }

  private getBicepBitSuffixName(): string {
    if (isWindows()) {
      return "bicep-win-x64.exe";
    }
    if (isMacOS()) {
      return "bicep-osx-x64";
    }
    return "bicep-linux-x64";
  }

  private getBicepInstallDir(): string {
    return path.join(os.homedir(), `.${ConfigFolderName}`, "bin", "bicep");
  }

  private async queryVersion(path: string): Promise<string> {
    const output = await cpUtils.executeCommand(
      undefined,
      this._logger,
      { shell: false },
      path,
      "--version"
    );
    const regex = /(?<major_version>\d+)\.(?<minor_version>\d+)\.(?<patch_version>\d+)/gm;
    const match = regex.exec(output);
    if (!match) {
      return "";
    }
    return `v${match.groups?.major_version}.${match.groups?.minor_version}.${match.groups?.patch_version}`;
  }
}

function sendSystemErrorEvent(
  eventName: DepsCheckerEvent,
  errorMessage: string,
  errorStack: string,
  telemetry?: TelemetryReporter
): void {
  const error = new SystemError(
    eventName,
    `errorMsg=${errorMessage},errorStack=${errorStack}`,
    source,
    errorStack
  );
  sendErrorTelemetryThenReturnError(eventName, error, telemetry, getCommonProps());
}

function getCommonProps(): { [key: string]: string } {
  const properties: { [key: string]: string } = {};
  properties[TelemetryMeasurement.OSArch] = os.arch();
  properties[TelemetryMeasurement.OSRelease] = os.release();
  properties[SolutionTelemetryProperty.Component] = SolutionTelemetryComponentName;
  properties[SolutionTelemetryProperty.Success] = SolutionTelemetrySuccess.Yes;
  return properties;
}

async function runWithProgressIndicator(
  callback: () => Promise<void>,
  logger: LogProvider | undefined
): Promise<void> {
  let counter = 1;
  const timer = setInterval(() => {
    const dots = Array(counter).fill(".").join("");
    logger?.info(dots);
    counter += 1;
  }, 1000); // same as vscode-dotnet-runtime);
  try {
    await callback();
  } finally {
    clearTimeout(timer);
  }
}

async function displayLearnMore(
  message: string,
  link: string,
  ctx: SolutionContext
): Promise<boolean> {
  if (!ctx.ui) {
    // no dialog, always continue
    return true;
  }
  const res = await ctx.ui?.showMessage("info", message, true, Messages.learnMoreButtonText);
  const userSelected: string | undefined = res?.isOk() ? res.value : undefined;

  if (userSelected === Messages.learnMoreButtonText) {
    ctx.telemetryReporter?.sendTelemetryEvent(DepsCheckerEvent.clickLearnMore, getCommonProps());
    ctx.ui?.openUrl(link);
    return displayLearnMore(message, link, ctx);
  }
  ctx.telemetryReporter?.sendTelemetryEvent(DepsCheckerEvent.clickCancel);
  return false;
}
