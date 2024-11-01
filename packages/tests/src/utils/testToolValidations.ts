// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { BrowserContext } from "playwright";
import { Timeout, ValidationContent } from "./constants";
import { getPlaywrightScreenshotPath } from "./nameUtil";
import { RetryHandler } from "./retryHandler";

export async function validateWelcomeAndReplyBot(
  context: BrowserContext,
  options: {
    hasWelcomeMessage?: boolean;
    hasCommandReplyValidation: boolean;
    botCommand?: string;
    expectedWelcomeMessage?: string;
    expectedReplyMessage?: string;
    timeout?: number;
  } = {
    hasWelcomeMessage: true,
    hasCommandReplyValidation: true,
    botCommand: "helloWorld",
    expectedWelcomeMessage: ValidationContent.AiChatBotWelcomeInstruction,
    expectedReplyMessage: ValidationContent.AiBotErrorMessage,
  }
): Promise<void> {
  const page = await context.newPage();
  page.setDefaultTimeout(Timeout.playwrightDefaultTimeout);
  const timeout = options?.timeout ? options.timeout : 30 * 60 * 1000;
  try {
    console.log("start to verify bot");
    await page.goto("http://localhost:56150/");
    await page.waitForTimeout(Timeout.shortTimeLoading);

    if (options.hasWelcomeMessage) {
      await RetryHandler.retry(async () => {
        await page?.waitForSelector(
          `p:has-text("${
            options?.expectedWelcomeMessage ||
            ValidationContent.AiChatBotWelcomeInstruction
          }")`
        );
        console.log(
          options?.expectedWelcomeMessage ||
            ValidationContent.AiChatBotWelcomeInstruction
        );
        console.log("verified bot that it has sent welcome!!!");
      }, 2);
    }

    if (options.hasCommandReplyValidation) {
      await RetryHandler.retry(async () => {
        console.log("sending message ", options?.botCommand || "helloWorld");
        const textbox = await page?.waitForSelector(
          'div[contenteditable="true"][role="textbox"]'
        );
        await textbox?.fill(options?.botCommand || "helloWorld");
        const sendButton = await page?.waitForSelector(
          'button[aria-label="Send Message"]'
        );
        await sendButton?.click();
        await page?.waitForSelector(
          `p:has-text("${options?.expectedReplyMessage}")`,
          { timeout: timeout }
        );
        console.log(
          `verify bot successfully with content ${options?.expectedReplyMessage}!!!`
        );
      }, 2);
    }

    await page.waitForTimeout(Timeout.shortTimeLoading);
  } catch (error) {
    await page.screenshot({
      path: getPlaywrightScreenshotPath("error"),
      fullPage: true,
    });
    throw error;
  }
}
