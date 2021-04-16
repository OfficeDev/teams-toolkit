import * as vscode from "vscode";
import { ExtTelemetry } from "../telemetry/extTelemetry";
import { TelemetryEvent } from "../telemetry/extTelemetryEvents";

const SURVEY_URL = "https://aka.ms/AAamyhp"; // To be updated

enum ExtensionSurveyStateKeys {
  DoNotShowAgain = "survey/doNotShowAgain",
  RemindMeLater = "survey/remindMeLater",
  DisableSurveyForTime = "survey/disableSurveyForTime",
}

const ExtensionSurveyStrings = {
  "takeSurvey": {
      "title": "Take Survey",
      "message": "takeSurvey"
    },
    "remindMeLater": {
      "title": "Remind Me Later",
      "message": "remindMeLater"
    },
    "dontShowAgain": {
      "title": "Don't Show Again",
      "message": "dontShowAgain"
    },
    "banner": {
      "title": "Can you please take 2 minutes to tell us how the TeamsFx extension is working for you?",
      "message": "userAsked"
    },
    "cancelMessage": "userCancelled"
};

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
      title: ExtensionSurveyStrings.takeSurvey.title,
      run: async (): Promise<void> => {
        ExtTelemetry.sendTelemetryEvent(TelemetryEvent.Survey, {
          "message": ExtensionSurveyStrings.takeSurvey.message
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
      title: ExtensionSurveyStrings.remindMeLater.title,
      run: async (): Promise<void> => {
        ExtTelemetry.sendTelemetryEvent(TelemetryEvent.Survey, {
          "message": ExtensionSurveyStrings.remindMeLater.message
        });
        const remindMeLaterTime = Date.now() + this.timeToShowSurvey;
        await globalState.update(
          ExtensionSurveyStateKeys.RemindMeLater,
          remindMeLaterTime
        );
      },
    };

    const never = {
      title: ExtensionSurveyStrings.dontShowAgain.title,
      run: async (): Promise<void> => {
        ExtTelemetry.sendTelemetryEvent(TelemetryEvent.Survey, {
          "message": ExtensionSurveyStrings.dontShowAgain.message
        });
        await globalState.update(ExtensionSurveyStateKeys.DoNotShowAgain, true);
      },
    };

    const selection = await vscode.window.showInformationMessage(
      ExtensionSurveyStrings.banner.title,
      take,
      remind,
      never
    );

    if (selection) {
      ExtTelemetry.sendTelemetryEvent(TelemetryEvent.Survey, {
        "message": ExtensionSurveyStrings.banner.message
      });
      await selection.run();
    } else {
      ExtTelemetry.sendTelemetryEvent(TelemetryEvent.Survey, {
        "message": ExtensionSurveyStrings.cancelMessage
      });
    }
  }
}