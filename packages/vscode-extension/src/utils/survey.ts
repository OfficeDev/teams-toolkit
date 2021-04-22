import * as vscode from "vscode";
import { ExtTelemetry } from "../telemetry/extTelemetry";
import { TelemetryEvent } from "../telemetry/extTelemetryEvents";
import * as StringResources from "../resources/Strings.json";

const SURVEY_URL = "https://aka.ms/AAamyhp"; // To be updated

enum ExtensionSurveyStateKeys {
  DoNotShowAgain = "survey/doNotShowAgain",
  RemindMeLater = "survey/remindMeLater",
  DisableSurveyForTime = "survey/disableSurveyForTime",
}

const TIME_TO_DISABLE_SURVEY = 1000 * 60 * 60 * 24 * 7 * 12; // 4 weeks
const TIME_TO_SHOW_SURVEY = 1000 * 60 * 60 * 1; // 1 hours
const SAMPLE_PERCENTAGE = 25; // 25 percent for public preview


export class ExtensionSurvey {
  private context: vscode.ExtensionContext;
  private timeToShowSurvey: number;
  private samplePercentage: number;
  private timeToDisableSurvey: number;

  constructor(
    context: vscode.ExtensionContext,
    timeToShowSurvey?: number,
    samplePercentage?: number,
    timeToDisableSurvey?: number
  ) {
    this.context = context;
    this.timeToShowSurvey = timeToShowSurvey ? timeToShowSurvey : TIME_TO_SHOW_SURVEY;
    this.samplePercentage = samplePercentage ? samplePercentage : SAMPLE_PERCENTAGE;
    this.timeToDisableSurvey = timeToDisableSurvey ? timeToDisableSurvey: TIME_TO_DISABLE_SURVEY;
  }

  public async activate(): Promise<void> {
    if (!this.shouldShowBanner()) {
      return;
    }

    setTimeout(() => this.showSurvey(), this.timeToShowSurvey);
  }

  public shouldShowBanner(): boolean {
    const globalState = this.context.globalState;
    const doNotShowAgain = globalState.get(
      ExtensionSurveyStateKeys.DoNotShowAgain,
      false
    );
    if (doNotShowAgain) {
      return false;
    }

    const currentTime = Date.now();
    const remindMeLaterTime = globalState.get(
      ExtensionSurveyStateKeys.RemindMeLater,
      0
    );
    if (remindMeLaterTime > currentTime) {
      return false;
    }

    const disableSurveyForTime = globalState.get(
      ExtensionSurveyStateKeys.DisableSurveyForTime,
      0
    );
    if (disableSurveyForTime > currentTime) {
      return false;
    }

    const randomSample: number = Math.floor(Math.random() * 100) + 1;
    if (randomSample > this.samplePercentage) {
      return false;
    }

    return true;
  }

  public async showSurvey(): Promise<void> {
    const globalState = this.context.globalState;
    const extension = vscode.extensions.getExtension("Microsoft.teamsfx-extension");
    if (!extension) {
      return;
    }

    const extensionVersion = extension.packageJSON.version || "unknown";
    const take = {
      title: StringResources.vsc.survey.takeSurvey.title,
      run: async (): Promise<void> => {
        ExtTelemetry.sendTelemetryEvent(TelemetryEvent.Survey, {
          "message": StringResources.vsc.survey.takeSurvey.message
        });
        vscode.commands.executeCommand(
          "vscode.open",
          vscode.Uri.parse(
            `${SURVEY_URL}?o=${encodeURIComponent(
              process.platform
            )}&v=${encodeURIComponent(extensionVersion)}`
          )
        );
        const disableSurveyForTime = Date.now() + this.timeToDisableSurvey;
        await globalState.update(
          ExtensionSurveyStateKeys.DisableSurveyForTime,
          disableSurveyForTime
        );
      },
    };

    const remind = {
      title: StringResources.vsc.survey.remindMeLater.title,
      run: async (): Promise<void> => {
        ExtTelemetry.sendTelemetryEvent(TelemetryEvent.Survey, {
          "message": StringResources.vsc.survey.remindMeLater.message
        });
        const remindMeLaterTime = Date.now() + this.timeToShowSurvey;
        await globalState.update(
          ExtensionSurveyStateKeys.RemindMeLater,
          remindMeLaterTime
        );
      },
    };

    const never = {
      title: StringResources.vsc.survey.dontShowAgain.title,
      run: async (): Promise<void> => {
        ExtTelemetry.sendTelemetryEvent(TelemetryEvent.Survey, {
          "message": StringResources.vsc.survey.dontShowAgain.message
        });
        await globalState.update(ExtensionSurveyStateKeys.DoNotShowAgain, true);
      },
    };

    const selection = await vscode.window.showInformationMessage(
      StringResources.vsc.survey.banner.title,
      take,
      remind,
      never
    );

    if (selection) {
      ExtTelemetry.sendTelemetryEvent(TelemetryEvent.Survey, {
        "message": StringResources.vsc.survey.banner.message
      });
      await selection.run();
    } else {
      ExtTelemetry.sendTelemetryEvent(TelemetryEvent.Survey, {
        "message": StringResources.vsc.survey.cancelMessage
      });
    }
  }
}