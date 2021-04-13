// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import {
  Answer,
  Dialog,
  DialogMsg,
  DialogType,
  IQuestion,
  MsgLevel,
  IProgressHandler,
} from "fx-api";

export interface StubQuestion {
  description: string;
  value: Answer;
}

export class MockProcessHandler implements IProgressHandler {
  public async start(detail?: string): Promise<void> {}
  public async next(detail?: string): Promise<void> {}
  public async end(): Promise<void> {}
}

export class MockDialog implements Dialog {
  private static instance: MockDialog;
  private constructor() {
    this.questions = [];
  }
  private questions: StubQuestion[];

  public static getInstance(): MockDialog {
    if (!MockDialog.instance) {
      MockDialog.instance = new MockDialog();
    }

    return MockDialog.instance;
  }

  public loadQuestions(questions: StubQuestion[]): MockDialog {
    this.questions = questions;
    return this;
  }
  public restore(): MockDialog {
    this.questions = [];
    return this;
  }

  public async communicate(msg: DialogMsg): Promise<DialogMsg> {
    switch (msg.dialogType) {
      case DialogType.Ask: {
        const q = msg.content as IQuestion;
        for (let mq of this.questions) {
          if (mq.description === q.description) {
            return new DialogMsg(DialogType.Answer, mq.value);
          }
        }
      }
      default: {
        return new DialogMsg(DialogType.Show, {
          description: "mock data",
          level: MsgLevel.Info,
        });
      }
    }
  }

  public createProgressBar(
    title: string,
    totalSteps: number
  ): IProgressHandler {
    return new MockProcessHandler();
  }
}
