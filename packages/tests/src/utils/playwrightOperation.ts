// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { BrowserContext, Page, chromium, Frame } from "playwright";
import { assert } from "chai";
import { Timeout, ValidationContent, TemplateProject } from "./constants";
import { RetryHandler } from "./retryHandler";
import { getPlaywrightScreenshotPath } from "./nameUtil";
import axios from "axios";
import { SampledebugContext } from "../ui-test/samples/sampledebugContext";
import path from "path";
import fs from "fs";
import { dotenvUtil } from "./envUtil";

export const sampleValidationMap: Record<
  TemplateProject,
  (page: Page, ...args: any) => Promise<void>
> = {
  [TemplateProject.HelloWorldTabBackEnd]: validateTab,
  [TemplateProject.ContactExporter]: validateContact,
  [TemplateProject.OneProductivityHub]: validateOneProducitvity,
  [TemplateProject.HelloWorldBotSSO]: validateBot,
  [TemplateProject.TodoListBackend]: validateTodoList,
  [TemplateProject.TodoListSpfx]: validateSpfx,
  [TemplateProject.ShareNow]: validateShareNow,
  [TemplateProject.MyFirstMetting]: () => Promise.resolve(),
  [TemplateProject.TodoListM365]: validateTodoList,
  [TemplateProject.NpmSearch]: validateNpm,
  [TemplateProject.ProactiveMessaging]: validateProactiveMessaging,
  [TemplateProject.AdaptiveCard]: validateAdaptiveCard,
  [TemplateProject.IncomingWebhook]: () => Promise.resolve(),
  [TemplateProject.GraphConnector]: validateGraphConnector,
  [TemplateProject.StockUpdate]: validateStockUpdate,
  [TemplateProject.QueryOrg]: validateQueryOrg,
  [TemplateProject.Deeplinking]: () => Promise.resolve(),
  [TemplateProject.Dashboard]: validateDashboardTab,
  [TemplateProject.AssistDashboard]: validateDashboardTab,
  [TemplateProject.DiceRoller]: () => Promise.resolve(),
  [TemplateProject.OutlookTab]: validatePersonalTab,
  [TemplateProject.OutlookSignature]: () => Promise.resolve(),
  [TemplateProject.ChefBot]: () => Promise.resolve(),
};

export async function initPage(
  context: BrowserContext,
  teamsAppId: string,
  username: string,
  password: string,
  dashboardFlag = false
): Promise<Page> {
  let page = await context.newPage();
  page.setDefaultTimeout(Timeout.playwrightDefaultTimeout);

  // open teams app page
  // https://github.com/puppeteer/puppeteer/issues/3338
  await Promise.all([
    page.goto(
      `https://teams.microsoft.com/_#/l/app/${teamsAppId}?installAppPackage=true`
    ),
    page.waitForNavigation(),
  ]);

  // input username
  await RetryHandler.retry(async () => {
    await page.fill("input.input[type='email']", username);
    console.log(`fill in username ${username}`);

    // next
    await Promise.all([
      page.click("input.button[type='submit']"),
      page.waitForNavigation(),
    ]);
  });

  // input password
  console.log(`fill in password`);
  await page.fill("input.input[type='password'][name='passwd']", password);

  // sign in
  await Promise.all([
    page.click("input.button[type='submit']"),
    page.waitForNavigation(),
  ]);

  // stay signed in confirm page
  console.log(`stay signed confirm`);
  await Promise.all([
    page.click("input.button[type='submit'][value='Yes']"),
    page.waitForNavigation(),
  ]);
  await page.waitForTimeout(Timeout.shortTimeLoading);

  // add app
  await RetryHandler.retry(async (retries: number) => {
    if (retries > 0) {
      console.log(`Retried to run adding app for ${retries} times.`);
    }
    await page.close();
    console.log(`open teams page`);
    page = await context.newPage();
    await Promise.all([
      page.goto(
        `https://teams.microsoft.com/_#/l/app/${teamsAppId}?installAppPackage=true`
      ),
      page.waitForNavigation(),
    ]);
    await page.waitForTimeout(Timeout.longTimeWait);
    console.log("click add button");

    const frameElementHandle = await page.waitForSelector(
      "iframe.embedded-page-content"
    );
    const frame = await frameElementHandle?.contentFrame();
    const addBtn = await frame?.waitForSelector("button span:has-text('Add')");

    // dashboard template will have a popup
    if (dashboardFlag) {
      console.log("Before popup");
      const [popup] = await Promise.all([
        page
          .waitForEvent("popup")
          .then((popup) =>
            popup
              .waitForEvent("close", {
                timeout: Timeout.playwrightConsentPopupPage,
              })
              .catch(() => popup)
          )
          .catch(() => {}),
        addBtn?.click(),
      ]);
      console.log("after popup");

      if (popup && !popup?.isClosed()) {
        // input password
        console.log(`fill in password`);
        await popup.fill(
          "input.input[type='password'][name='passwd']",
          password
        );
        // sign in
        await Promise.all([
          popup.click("input.button[type='submit'][value='Sign in']"),
          popup.waitForNavigation(),
        ]);
        await popup.click("input.button[type='submit'][value='Accept']");
      }
    } else {
      await addBtn?.click();
    }
    await page.waitForTimeout(Timeout.shortTimeLoading);
    // verify add page is closed
    await frame?.waitForSelector("button span:has-text('Add')", {
      state: "detached",
    });
    try {
      try {
        await page?.waitForSelector(".team-information span:has-text('About')");
      } catch (error) {
        await page?.waitForSelector(
          ".ts-messages-header span:has-text('About')"
        );
      }
      console.log("[success] app loaded");
    } catch (error) {
      await page.screenshot({
        path: getPlaywrightScreenshotPath("error"),
        fullPage: true,
      });
      assert.fail("[Error] add app failed");
    }
    await page.waitForTimeout(Timeout.shortTimeLoading);
  });

  return page;
}

export async function initTeamsPage(
  context: BrowserContext,
  teamsAppId: string,
  username: string,
  password: string,
  teamsAppName: string,
  type = ""
): Promise<Page> {
  let page = await context.newPage();
  try {
    page.setDefaultTimeout(Timeout.playwrightDefaultTimeout);

    // open teams app page
    // https://github.com/puppeteer/puppeteer/issues/3338
    await Promise.all([
      page.goto(
        `https://teams.microsoft.com/_#/l/app/${teamsAppId}?installAppPackage=true`
      ),
      page.waitForNavigation(),
    ]);

    // input username
    await RetryHandler.retry(async () => {
      await page.fill("input.input[type='email']", username);
      console.log(`fill in username ${username}`);

      // next
      await Promise.all([
        page.click("input.button[type='submit']"),
        page.waitForNavigation(),
      ]);
    });

    // input password
    console.log(`fill in password`);
    await page.fill("input.input[type='password'][name='passwd']", password);

    // sign in
    await Promise.all([
      page.click("input.button[type='submit']"),
      page.waitForNavigation(),
    ]);

    // stay signed in confirm page
    console.log(`stay signed confirm`);
    await Promise.all([
      page.click("input.button[type='submit'][value='Yes']"),
      page.waitForNavigation(),
    ]);

    // add app
    await RetryHandler.retry(async (retries: number) => {
      if (retries > 0) {
        console.log(`Retried to run adding app for ${retries} times.`);
      }
      await page.close();
      console.log(`open teams page`);
      page = await context.newPage();
      await Promise.all([
        page.goto(
          `https://teams.microsoft.com/_#/l/app/${teamsAppId}?installAppPackage=true`
        ),
        page.waitForNavigation(),
      ]);
      await page.waitForTimeout(Timeout.longTimeWait);
      console.log("click add button");
      const frameElementHandle = await page.waitForSelector(
        "iframe.embedded-page-content"
      );
      const frame = await frameElementHandle?.contentFrame();

      try {
        console.log("dismiss message");
        await page.click('button:has-text("Dismiss")');
      } catch (error) {
        console.log("no message to dismiss");
      }
      // default
      const addBtn = await frame?.waitForSelector(
        "button span:has-text('Add')"
      );
      await addBtn?.click();
      await page.waitForTimeout(Timeout.shortTimeLoading);

      if (type === "meeting") {
        // verify add page is closed
        const frameElementHandle = await page.waitForSelector(
          "iframe.embedded-page-content"
        );
        const frame = await frameElementHandle?.contentFrame();
        await frame?.waitForSelector(
          `h1:has-text('Add ${teamsAppName} to a team')`
        );
        // TODO: need to add more logic
        console.log("successful to add teams app!!!");
        return;
      }

      // verify add page is closed
      await frame?.waitForSelector(
        `h1:has-text('Add ${teamsAppName} to a team')`
      );

      try {
        const frameElementHandle = await page.waitForSelector(
          "iframe.embedded-page-content"
        );
        const frame = await frameElementHandle?.contentFrame();

        try {
          const items = await frame?.waitForSelector("li.ui-dropdown__item");
          await items?.click();
        } catch (error) {
          const searchBtn = await frame?.waitForSelector(
            "div.ui-dropdown__toggle-indicator"
          );
          await searchBtn?.click();
          await page.waitForTimeout(Timeout.shortTimeLoading);
          const items = await frame?.waitForSelector("li.ui-dropdown__item");
          await items?.click();
        }

        const setUpBtn = await frame?.waitForSelector(
          'button span:has-text("Set up a tab")'
        );
        await setUpBtn?.click();
        await page.waitForTimeout(Timeout.shortTimeLoading);
      } catch (error) {
        await page.screenshot({
          path: getPlaywrightScreenshotPath("error"),
          fullPage: true,
        });
        throw error;
      }
      {
        const frameElementHandle = await page.waitForSelector(
          "iframe.embedded-iframe"
        );
        const frame = await frameElementHandle?.contentFrame();
        if (type === "spfx") {
          try {
            console.log("Load debug scripts");
            await frame?.click('button:has-text("Load debug scripts")');
            console.log("Debug scripts loaded");
          } catch (error) {
            console.log("No debug scripts to load");
          }
        }
        try {
          const saveBtn = await page.waitForSelector(`button:has-text("Save")`);
          await saveBtn?.click();
          await page.waitForSelector(`button:has-text("Save")`, {
            state: "detached",
          });
        } catch (error) {
          console.log("No save button to click");
        }
      }
      await page.waitForTimeout(Timeout.shortTimeLoading);
      console.log("successful to add teams app!!!");
    });

    return page;
  } catch (error) {
    await page.screenshot({
      path: getPlaywrightScreenshotPath("error"),
      fullPage: true,
    });
    throw error;
  }
}

export async function validateOneProducitvity(page: Page, displayName: string) {
  try {
    console.log("start to verify One Productivity Hub");
    const frameElementHandle = await page.waitForSelector(
      "iframe.embedded-iframe"
    );
    const frame = await frameElementHandle?.contentFrame();
    try {
      console.log("dismiss message");
      await page
        .click('button:has-text("Dismiss")', {
          timeout: Timeout.playwrightDefaultTimeout,
        })
        .catch(() => {});
    } catch (error) {
      console.log("no message to dismiss");
    }
    try {
      const startBtn = await frame?.waitForSelector(
        'button:has-text("Start One Productivity Hub")'
      );
      console.log("click Start One Productivity Hub button");
      await RetryHandler.retry(async () => {
        console.log("Before popup");
        const [popup] = await Promise.all([
          page
            .waitForEvent("popup")
            .then((popup) =>
              popup
                .waitForEvent("close", {
                  timeout: Timeout.playwrightConsentPopupPage,
                })
                .catch(() => popup)
            )
            .catch(() => {}),
          startBtn?.click(),
        ]);
        console.log("after popup");

        if (popup && !popup?.isClosed()) {
          await popup
            .click('button:has-text("Reload")', {
              timeout: Timeout.playwrightConsentPageReload,
            })
            .catch(() => {});
          await popup.click("input.button[type='submit'][value='Accept']");
        }
        await frame?.waitForSelector(`div:has-text("${displayName}")`);
        // TODO: need to add more logic
      });
    } catch (e: any) {
      console.log(`[Command not executed successfully] ${e.message}`);
      await page.screenshot({
        path: getPlaywrightScreenshotPath("error"),
        fullPage: true,
      });
      throw e;
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

export async function validateTab(
  page: Page,
  displayName: string,
  includeFunction?: boolean
) {
  try {
    const frameElementHandle = await page.waitForSelector(
      "iframe.embedded-iframe"
    );
    const frame = await frameElementHandle?.contentFrame();

    await RetryHandler.retry(async () => {
      console.log("Before popup");
      const [popup] = await Promise.all([
        page
          .waitForEvent("popup")
          .then((popup) =>
            popup
              .waitForEvent("close", {
                timeout: Timeout.playwrightConsentPopupPage,
              })
              .catch(() => popup)
          )
          .catch(() => {}),
        frame?.click('button:has-text("Authorize")', {
          timeout: Timeout.playwrightAddAppButton,
          force: true,
          noWaitAfter: true,
          clickCount: 2,
          delay: 10000,
        }),
      ]);
      console.log("after popup");

      if (popup && !popup?.isClosed()) {
        await popup
          .click('button:has-text("Reload")', {
            timeout: Timeout.playwrightConsentPageReload,
          })
          .catch(() => {});
        await popup.click("input.button[type='submit'][value='Accept']");
      }

      await frame?.waitForSelector(`b:has-text("${displayName}")`);
    });

    if (includeFunction) {
      await RetryHandler.retry(async () => {
        console.log("verify function info");
        const authorizeButton = await frame?.waitForSelector(
          'button:has-text("Call Azure Function")'
        );
        await authorizeButton?.click();
        const backendElement = await frame?.waitForSelector(
          'pre:has-text("receivedHTTPRequestBody")'
        );
        const content = await backendElement?.innerText();
        if (!content?.includes("User display name is"))
          assert.fail("User display name is not found in the response");
        console.log("verify function info success");
      });
    }
  } catch (error) {
    await page.screenshot({
      path: getPlaywrightScreenshotPath("error"),
      fullPage: true,
    });
    throw error;
  }
}

export async function validateReactTab(
  page: Page,
  displayName: string,
  includeFunction?: boolean
) {
  try {
    const frameElementHandle = await page.waitForSelector(
      "iframe.embedded-iframe"
    );
    const frame = await frameElementHandle?.contentFrame();
    if (includeFunction) {
      await RetryHandler.retry(async () => {
        console.log("Before popup");
        const [popup] = await Promise.all([
          page
            .waitForEvent("popup")
            .then((popup) =>
              popup
                .waitForEvent("close", {
                  timeout: Timeout.playwrightConsentPopupPage,
                })
                .catch(() => popup)
            )
            .catch(() => {}),
          frame?.click('button:has-text("Call Azure Function")', {
            timeout: Timeout.playwrightAddAppButton,
            force: true,
            noWaitAfter: true,
            clickCount: 2,
            delay: 10000,
          }),
        ]);
        console.log("after popup");

        if (popup && !popup?.isClosed()) {
          await popup
            .click('button:has-text("Reload")', {
              timeout: Timeout.playwrightConsentPageReload,
            })
            .catch(() => {});
          await popup.click("input.button[type='submit'][value='Accept']");
        }
      });

      console.log("verify function info");
      const backendElement = await frame?.waitForSelector(
        'pre:has-text("receivedHTTPRequestBody")'
      );
      const content = await backendElement?.innerText();
      if (!content?.includes("User display name is"))
        assert.fail("User display name is not found in the response");
      console.log("verify function info success");
    }

    await frame?.waitForSelector(`b:has-text("${displayName}")`);
  } catch (error) {
    await page.screenshot({
      path: getPlaywrightScreenshotPath("error"),
      fullPage: true,
    });
    throw error;
  }
}

export async function validateReactOutlookTab(
  page: Page,
  displayName: string,
  includeFunction?: boolean
) {
  try {
    await page.waitForTimeout(Timeout.longTimeWait);
    const frameElementHandle = await page.waitForSelector(
      'iframe[data-tid="app-host-iframe"]'
    );
    const frame = await frameElementHandle?.contentFrame();
    if (includeFunction) {
      await RetryHandler.retry(async () => {
        console.log("Before popup");
        const [popup] = await Promise.all([
          page
            .waitForEvent("popup")
            .then((popup) =>
              popup
                .waitForEvent("close", {
                  timeout: Timeout.playwrightConsentPopupPage,
                })
                .catch(() => popup)
            )
            .catch(() => {}),
          frame?.click('button:has-text("Call Azure Function")', {
            timeout: Timeout.playwrightAddAppButton,
            force: true,
            noWaitAfter: true,
            clickCount: 2,
            delay: 10000,
          }),
        ]);
        console.log("after popup");

        if (popup && !popup?.isClosed()) {
          await popup
            .click('button:has-text("Reload")', {
              timeout: Timeout.playwrightConsentPageReload,
            })
            .catch(() => {});
          await popup.click("input.button[type='submit'][value='Accept']");
        }
      });

      console.log("verify function info");
      const backendElement = await frame?.waitForSelector(
        'pre:has-text("receivedHTTPRequestBody")'
      );
      const content = await backendElement?.innerText();
      if (!content?.includes("User display name is"))
        assert.fail("User display name is not found in the response");
      console.log("verify function info success");
    }

    await frame?.waitForSelector(`b:has-text("${displayName}")`);
  } catch (error) {
    await page.screenshot({
      path: getPlaywrightScreenshotPath("error"),
      fullPage: true,
    });
    throw error;
  }
}

export async function validateBasicTab(
  page: Page,
  content = "Hello, World",
  hubState = "Teams"
) {
  try {
    const frameElementHandle = await page.waitForSelector(
      "iframe.embedded-iframe"
    );
    const frame = await frameElementHandle?.contentFrame();
    console.log(`Check if ${content} showed`);
    await frame?.waitForSelector(`h1:has-text("${content}")`);
    console.log(`Check if ${hubState} showed`);
    await frame?.waitForSelector(`#hubState:has-text("${hubState}")`);
    console.log(`${hubState} showed`);
  } catch (error) {
    await page.screenshot({
      path: getPlaywrightScreenshotPath("error"),
      fullPage: true,
    });
    throw error;
  }
}

export async function validateTabNoneSSO(
  page: Page,
  content = "Congratulations",
  content2 = "Add Single Sign On feature to retrieve user profile"
) {
  try {
    const frameElementHandle = await page.waitForSelector(
      "iframe.embedded-iframe"
    );
    const frame = await frameElementHandle?.contentFrame();
    console.log(`Check if ${content} showed`);
    await frame?.waitForSelector(`h1:has-text("${content}")`);
    console.log(`Check if ${content2} showed`);
    await frame?.waitForSelector(`h2:has-text("${content2}")`);
    console.log(`${content2} showed`);
  } catch (error) {
    await page.screenshot({
      path: getPlaywrightScreenshotPath("error"),
      fullPage: true,
    });
    throw error;
  }
}

export async function validatePersonalTab(page: Page) {
  try {
    const frameElementHandle = await page.waitForSelector(
      "iframe.embedded-iframe"
    );
    const frame = await frameElementHandle?.contentFrame();
    console.log(`Check if Congratulations showed`);
    await frame?.waitForSelector(`h1:has-text("Congratulations!")`);
    console.log(`Check tab 1 content`);
    await frame?.waitForSelector(`h2:has-text("Change this code")`);
    console.log(`Check tab 2 content`);
    const tab1 = await frame?.waitForSelector(
      `span:has-text("2. Provision and Deploy to the Cloud")`
    );
    await tab1?.click();
    {
      const frameElementHandle = await page.waitForSelector(
        "iframe.embedded-iframe"
      );
      const frame = await frameElementHandle?.contentFrame();
      await frame?.waitForSelector(`h2:has-text("Deploy to the Cloud")`);
    }
    console.log(`debug finish!`);
  } catch (error) {
    await page.screenshot({
      path: getPlaywrightScreenshotPath("error"),
      fullPage: true,
    });
    throw error;
  }
}

export async function validateOutlookTab(
  page: Page,
  displayName: string,
  includeFunction?: boolean
) {
  try {
    const frameElementHandle = await page.waitForSelector(
      'iframe[data-tid="app-host-iframe"]'
    );
    const frame = await frameElementHandle?.contentFrame();

    console.log("Before popup");
    const [popup] = await Promise.all([
      page
        .waitForEvent("popup")
        .then((popup) =>
          popup
            .waitForEvent("close", {
              timeout: Timeout.playwrightConsentPopupPage,
            })
            .catch(() => popup)
        )
        .catch(() => {}),
      frame?.click('button:has-text("Authorize")', {
        timeout: Timeout.playwrightAddAppButton,
        force: true,
        noWaitAfter: true,
        clickCount: 2,
        delay: 10000,
      }),
    ]);
    console.log("after popup");

    if (popup && !popup?.isClosed()) {
      await popup
        .click('button:has-text("Reload")', {
          timeout: Timeout.playwrightConsentPageReload,
        })
        .catch(() => {});
      await popup.click("input.button[type='submit'][value='Accept']");
    }

    await frame?.waitForSelector(`span:has-text("${displayName}")`);

    if (includeFunction) {
      await RetryHandler.retry(async () => {
        const authorizeButton = await frame?.waitForSelector(
          'button:has-text("Call Azure Function")'
        );
        await authorizeButton?.click();
        const backendElement = await frame?.waitForSelector(
          'pre:has-text("receivedHTTPRequestBody")'
        );
        const content = await backendElement?.innerText();
        // TODO validate content
      });
    }
  } catch (error) {
    await page.screenshot({
      path: getPlaywrightScreenshotPath("error"),
      fullPage: true,
    });
    throw error;
  }
}

export async function validateBot(
  page: Page,
  command = "welcome",
  expected = ValidationContent.Bot
) {
  try {
    console.log("start to verify bot");
    await page.waitForTimeout(Timeout.shortTimeLoading);
    const frameElementHandle = await page.waitForSelector(
      "iframe.embedded-page-content"
    );
    const frame = await frameElementHandle?.contentFrame();
    try {
      console.log("dismiss message");
      await frame?.waitForSelector("div.ui-box");
      await page
        .click('button:has-text("Dismiss")', {
          timeout: Timeout.playwrightDefaultTimeout,
        })
        .catch(() => {});
    } catch (error) {
      console.log("no message to dismiss");
    }
    try {
      console.log("sending message ", command);
      await executeBotSuggestionCommand(page, frame, command);
      await frame?.click('button[name="send"]');
    } catch (e: any) {
      console.log(
        `[Command "${command}" not executed successfully] ${e.message}`
      );
    }
    if (command === "show") {
      await RetryHandler.retry(async () => {
        // wait for alert message to show
        const btn = await frame?.waitForSelector(
          `div.ui-box button:has-text("Continue")`
        );
        await btn?.click();
        // wait for new tab to show
        const popup = await page
          .waitForEvent("popup")
          .then((popup) =>
            popup
              .waitForEvent("close", {
                timeout: Timeout.playwrightConsentPopupPage,
              })
              .catch(() => popup)
          )
          .catch(() => {});
        if (popup && !popup?.isClosed()) {
          await popup
            .click('button:has-text("Reload")', {
              timeout: Timeout.playwrightConsentPageReload,
            })
            .catch(() => {});
          await popup.click("input.button[type='submit'][value='Accept']");
        }
        await RetryHandler.retry(async () => {
          await frame?.waitForSelector(`p:has-text("${expected}")`);
          console.log("verify bot successfully!!!");
        }, 2);
        console.log(`${expected}`);
      }, 2);
      console.log(`${expected}`);
    } else {
      await RetryHandler.retry(async () => {
        await frame?.waitForSelector(`p:has-text("${expected}")`);
        console.log("verify bot successfully!!!");
      }, 2);
      console.log(`${expected}`);
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

export async function validateNpm(page: Page, npmName: string) {
  try {
    console.log("start to verify npm search");
    await page.waitForTimeout(Timeout.shortTimeLoading);
    const frameElementHandle = await page.waitForSelector(
      "iframe.embedded-page-content"
    );
    const frame = await frameElementHandle?.contentFrame();
    try {
      console.log("dismiss message");
      await frame?.waitForSelector("div.ui-box");
      await page
        .click('button:has-text("Dismiss")', {
          timeout: Timeout.playwrightDefaultTimeout,
        })
        .catch(() => {});
    } catch (error) {
      console.log("no message to dismiss");
    }
    console.log("search npm ", npmName);
    const input = await frame?.waitForSelector("div.ui-box input.ui-box");
    await input?.type(npmName);
    try {
      const targetItem = await frame?.waitForSelector(
        `span:has-text("${npmName}")`
      );
      await targetItem?.click();
      await frame?.waitForSelector(`card span:has-text("${npmName}")`);
      console.log("verify npm search successfully!!!");
      await page.waitForTimeout(Timeout.shortTimeLoading);
    } catch (error) {
      await frame?.waitForSelector(
        'div.ui-box span:has-text("Unable to reach app. Please try again.")'
      );
      assert.fail("Unable to reach app. Please try again.");
    }
  } catch (error) {
    await page.screenshot({
      path: getPlaywrightScreenshotPath("error"),
      fullPage: true,
    });
    throw error;
  }
}

export async function validateDeeplinking(page: Page, displayName: string) {
  try {
    console.log("start to verify deeplinking");
    await page.waitForTimeout(Timeout.shortTimeLoading);
    try {
      console.log("dismiss message");
      await page
        ?.click('div:has-text("Dismiss")', {
          timeout: Timeout.playwrightDefaultTimeout,
        })
        .catch(() => {});
    } catch (error) {
      console.log("no message to dismiss");
    }

    const frameElementHandle = await page.waitForSelector(
      "iframe.embedded-page-content"
    );
    const frame = await frameElementHandle?.contentFrame();
    await frame?.waitForSelector('h1:has-text("Congratulations!")');

    // verify tab navigate within app tab
    await page.waitForTimeout(Timeout.shortTimeLoading);
    try {
      const navigateBtn = await page?.waitForSelector(
        'li div a span:has-text("Navigate within app")'
      );
      await navigateBtn?.click();
      await page.waitForTimeout(Timeout.shortTimeLoading);
      const frameElementHandle = await page.waitForSelector(
        "iframe.embedded-page-content"
      );
      const frame = await frameElementHandle?.contentFrame();
      await frame?.waitForSelector(
        'div.welcome div.main-section div#navigate-within-app h2:has-text("2. Navigate within the app")'
      );
      console.log("navigate within app tab found");
    } catch (error) {
      console.log("navigate within app tab verify failed");
      await page.screenshot({
        path: getPlaywrightScreenshotPath("error"),
        fullPage: true,
      });
      throw error;
    }

    // verify details tab
    await page.waitForTimeout(Timeout.shortTimeLoading);
    try {
      const detailsBtn = await page?.waitForSelector(
        'li div a span:has-text("Details Tab")'
      );
      await RetryHandler.retry(async () => {
        await detailsBtn?.click();
        await page.waitForTimeout(Timeout.shortTimeLoading);
        const frameElementHandle = await page.waitForSelector(
          "iframe.embedded-page-content"
        );
        const frame = await frameElementHandle?.contentFrame();
        await frame?.waitForSelector('li a span:has-text("Tab 1")');
        console.log("details tab found");
      });
    } catch (error) {
      console.log("details tab verify failed");
      await page.screenshot({
        path: getPlaywrightScreenshotPath("error"),
        fullPage: true,
      });
      throw error;
    }

    // verify navigate within hub tab
    await page.waitForTimeout(Timeout.shortTimeLoading);
    try {
      const navigateHubBtn = await page?.waitForSelector(
        'li div a span:has-text("Navigate within hub")'
      );
      await RetryHandler.retry(async () => {
        await navigateHubBtn?.click();
        await page.waitForTimeout(Timeout.shortTimeLoading);
        const frameElementHandle = await page.waitForSelector(
          "iframe.embedded-page-content"
        );
        const frame = await frameElementHandle?.contentFrame();
        await frame?.waitForSelector(
          'h1.center:has-text("Chat functionality")'
        );
        console.log("navigate within hub tab found");
      });
      // TODO: add person
    } catch (error) {
      console.log("navigate within hub tab verify failed");
      await page.screenshot({
        path: getPlaywrightScreenshotPath("error"),
        fullPage: true,
      });
      throw error;
    }

    // verify generate deeplink tab
    try {
      const shareBtn = await page?.waitForSelector(
        'li div a span:has-text("Generate Share URL")'
      );
      await RetryHandler.retry(async () => {
        await shareBtn?.click();
        await page.waitForTimeout(Timeout.shortTimeLoading);
        const frameElementHandle = await page.waitForSelector(
          "iframe.embedded-page-content"
        );
        const frame = await frameElementHandle?.contentFrame();
        await frame?.waitForSelector('span:has-text("Copy a link to ")');
        console.log("popup message found");
        const closeBtn = await frame?.waitForSelector(
          "dev.close-container button.icons-close"
        );
        await closeBtn?.click();
      });
    } catch (error) {
      await page.screenshot({
        path: getPlaywrightScreenshotPath("error"),
        fullPage: true,
      });
      throw error;
    }
    console.log("verify deeplinking successfully!!!");
  } catch (error) {
    await page.screenshot({
      path: getPlaywrightScreenshotPath("error"),
      fullPage: true,
    });
    throw error;
  }
}

export async function validateQueryOrg(page: Page, displayName: string) {
  try {
    console.log("start to verify query org");
    await page.waitForTimeout(Timeout.shortTimeLoading);
    const frameElementHandle = await page.waitForSelector(
      "iframe.embedded-page-content"
    );
    const frame = await frameElementHandle?.contentFrame();
    try {
      console.log("dismiss message");
      await frame?.waitForSelector("div.ui-box");
      await page
        .click('button:has-text("Dismiss")', {
          timeout: Timeout.playwrightDefaultTimeout,
        })
        .catch(() => {});
    } catch (error) {
      console.log("no message to dismiss");
    }
    const inputBar = await frame?.waitForSelector(
      "div.ui-popup__content input.ui-box"
    );
    await inputBar?.fill(displayName);
    await page.waitForTimeout(Timeout.shortTimeLoading);
    const loginBtn = await frame?.waitForSelector(
      'div.ui-popup__content a:has-text("sign in")'
    );
    // todo add more verify
    // await RetryHandler.retry(async () => {
    //   console.log("Before popup");
    //   const [popup] = await Promise.all([
    //     page
    //       .waitForEvent("popup")
    //       .then((popup) =>
    //         popup
    //           .waitForEvent("close", {
    //             timeout: Timeout.playwrightConsentPopupPage,
    //           })
    //           .catch(() => popup)
    //       )
    //       .catch(() => {}),
    //     loginBtn?.click(),
    //   ]);
    //   console.log("after popup");

    //   if (popup && !popup?.isClosed()) {
    //     await popup.click('span:has-text("Continue")')
    //     await popup.click("input.button[type='submit'][value='Accept']");
    //   }
    // });
    // console.log("search ", displayName);
    // const input = await frame?.waitForSelector("div.ui-box input.ui-box");
    // await input?.type(displayName);

    console.log("verify query org successfully!!!");
  } catch (error) {
    await page.screenshot({
      path: getPlaywrightScreenshotPath("error"),
      fullPage: true,
    });
    throw error;
  }
}

export async function validateShareNow(page: Page) {
  try {
    console.log("start to verify share now");
    await page.waitForTimeout(Timeout.shortTimeLoading);
    const frameElementHandle = await page.waitForSelector(
      "iframe.embedded-page-content"
    );
    const frame = await frameElementHandle?.contentFrame();
    try {
      console.log("dismiss message");
      await frame?.waitForSelector("div.ui-box");
      await page
        .click('button:has-text("Dismiss")', {
          timeout: Timeout.playwrightDefaultTimeout,
        })
        .catch(() => {});
    } catch (error) {
      console.log("no message to dismiss");
    }

    await page.waitForTimeout(Timeout.shortTimeLoading);
    // click Suggest content
    console.log("click Suggest content");
    const startBtn = await frame?.waitForSelector(
      'span:has-text("Suggest content")'
    );
    await startBtn?.click();
    await page.waitForTimeout(Timeout.shortTimeLoading);
    // select content type
    console.log("select content type");
    const popupModal = await frame?.waitForSelector(
      ".ui-dialog .dialog-provider-wrapper"
    );
    const typeSelector = await popupModal?.waitForSelector(
      'button:has-text("Select content type")'
    );
    await typeSelector?.click();
    await page.waitForTimeout(Timeout.shortTimeLoading);
    const item = await popupModal?.waitForSelector(
      'ul li:has-text("Article / blog")'
    );
    await item?.click();
    await page.waitForTimeout(Timeout.shortTimeLoading);
    // fill in title
    console.log("fill in title");
    const titleInput = await popupModal?.waitForSelector(
      'input[placeholder="Type a title for your post"]'
    );
    await titleInput?.fill("test title");
    await page.waitForTimeout(Timeout.shortTimeLoading);
    // fill in description
    console.log("fill in description");
    const descriptionInput = await popupModal?.waitForSelector(
      'textarea[placeholder="Describe why you\'re suggesting this content"]'
    );
    await descriptionInput?.fill("test description for content suggestion");
    await page.waitForTimeout(Timeout.shortTimeLoading);
    // fill in link
    console.log("fill in link");
    const linkInput = await popupModal?.waitForSelector(
      'input[placeholder="Type or paste a link"]'
    );
    await linkInput?.fill("https://www.test.com");
    await page.waitForTimeout(Timeout.shortTimeLoading);
    // submit
    const submitBtn = await frame?.waitForSelector('span:has-text("Submit")');
    console.log("submit");
    await submitBtn?.click();
    await page.waitForTimeout(Timeout.shortTimeLoading);
    // verify
    await frame?.waitForSelector('span:has-text("test title")');
  } catch (error) {
    await page.screenshot({
      path: getPlaywrightScreenshotPath("error"),
      fullPage: true,
    });
    throw error;
  }
}

export async function validateWorkFlowBot(page: Page) {
  try {
    const frameElementHandle = await page.waitForSelector(
      "iframe.embedded-page-content"
    );
    const frame = await frameElementHandle?.contentFrame();
    await frame
      ?.click('button:has-text("DoStuff")', {
        timeout: Timeout.playwrightDefaultTimeout,
      })
      .catch(() => {});
    await frame?.waitForSelector(`p:has-text("[ACK] Hello World Bot")`);
  } catch (error) {
    await page.screenshot({
      path: getPlaywrightScreenshotPath("error"),
      fullPage: true,
    });
    throw error;
  }
}

export async function validateNotificationBot(
  page: Page,
  notificationEndpoint = "http://127.0.0.1:3978/api/notification"
) {
  try {
    const frameElementHandle = await page.waitForSelector(
      "iframe.embedded-page-content"
    );
    const frame = await frameElementHandle?.contentFrame();
    await frame?.waitForSelector("div.ui-box");
    await page
      .click('button:has-text("Dismiss")', {
        timeout: Timeout.playwrightDefaultTimeout,
      })
      .catch(() => {});
    await RetryHandler.retry(async () => {
      try {
        const result = await axios.post(notificationEndpoint);
        if (result.status !== 200) {
          throw new Error(
            `POST /api/notification failed: status code: '${result.status}', body: '${result.data}'`
          );
        }
        console.log("Successfully sent notification");
      } catch (e: any) {
        console.log(
          `[Command "welcome" not executed successfully] ${e.message}`
        );
      }
      await frame?.waitForSelector(
        'p:has-text("This is a sample http-triggered notification to Person")'
      );
    }, 2);
    console.log("User received notification");
  } catch (error) {
    await page.screenshot({
      path: getPlaywrightScreenshotPath("error"),
      fullPage: true,
    });
    throw error;
  }
}

export async function validateStockUpdate(page: Page) {
  try {
    console.log("start to verify stock update");
    const frameElementHandle = await page.waitForSelector(
      "iframe.embedded-iframe"
    );
    const frame = await frameElementHandle?.contentFrame();
    try {
      console.log("dismiss message");
      await page
        .click('button:has-text("Dismiss")', {
          timeout: Timeout.playwrightDefaultTimeout,
        })
        .catch(() => {});
    } catch (error) {
      console.log("no message to dismiss");
    }
    try {
      console.log("click stock update");
      await frame?.waitForSelector('p:has-text("Microsoft Corporation")');
      console.log("verify stock update successfully!!!");
      await page.waitForTimeout(Timeout.shortTimeLoading);
    } catch (e: any) {
      console.log(`[Command not executed successfully] ${e.message}`);
      await page.screenshot({
        path: getPlaywrightScreenshotPath("error"),
        fullPage: true,
      });
      throw e;
    }
  } catch (error) {
    await page.screenshot({
      path: getPlaywrightScreenshotPath("error"),
      fullPage: true,
    });
    throw error;
  }
}

export async function validateTodoList(page: Page, displayName: string) {
  try {
    console.log("start to verify todo list");
    try {
      const tabs = await page.$$("button[role='tab']");
      const tab = tabs.find(async (tab) => {
        const text = await tab.innerText();
        return text?.includes("Todo List");
      });
      await tab?.click();
      await page.waitForTimeout(Timeout.shortTimeLoading);
      const frameElementHandle = await page.waitForSelector(
        "iframe.embedded-iframe"
      );
      const frame = await frameElementHandle?.contentFrame();
      const startBtn = await frame?.waitForSelector('button:has-text("Start")');
      console.log("click Start button");
      await RetryHandler.retry(async () => {
        console.log("Before popup");
        const [popup] = await Promise.all([
          page
            .waitForEvent("popup")
            .then((popup) =>
              popup
                .waitForEvent("close", {
                  timeout: Timeout.playwrightConsentPopupPage,
                })
                .catch(() => popup)
            )
            .catch(() => {}),
          startBtn?.click(),
        ]);
        console.log("after popup");

        if (popup && !popup?.isClosed()) {
          await popup
            .click('button:has-text("Reload")', {
              timeout: Timeout.playwrightConsentPageReload,
            })
            .catch(() => {});
          await popup.click("input.button[type='submit'][value='Accept']");
        }
        const addBtn = await frame?.waitForSelector(
          'button:has-text("Add task")'
        );
        await addBtn?.click();
        //TODO: verify add task

        // clean tab, right click
        await tab?.click({ button: "right" });
        await page.waitForTimeout(Timeout.shortTimeLoading);
        const contextMenu = await page.waitForSelector("ul[role='menu']");
      });
    } catch (e: any) {
      console.log(`[Command not executed successfully] ${e.message}`);
      await page.screenshot({
        path: getPlaywrightScreenshotPath("error"),
        fullPage: true,
      });
      throw e;
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

export async function validateProactiveMessaging(page: Page): Promise<void> {
  console.log(`validating proactive messaging`);
  await page.waitForTimeout(Timeout.shortTimeLoading);
  const frameElementHandle = await page.waitForSelector(
    "iframe.embedded-page-content"
  );
  const frame = await frameElementHandle?.contentFrame();
  try {
    console.log("dismiss message");
    await frame?.waitForSelector("div.ui-box");
    await page
      .click('button:has-text("Dismiss")', {
        timeout: Timeout.playwrightDefaultTimeout,
      })
      .catch(() => {});
  } catch (error) {
    console.log("no message to dismiss");
  }
  try {
    console.log("sending message ", "welcome");
    await executeBotSuggestionCommand(page, frame, "welcome");
    await frame?.click('button[name="send"]');
  } catch (e: any) {
    await page.screenshot({
      path: getPlaywrightScreenshotPath("error"),
      fullPage: true,
    });
    console.log(`[Command 'learn' not executed successfully] ${e.message}`);
    throw e;
  }
}

async function executeBotSuggestionCommand(
  page: Page,
  frame: null | Frame,
  command: string
) {
  try {
    await frame?.click(`div.ui-list__itemheader:has-text("${command}")`);
  } catch (e: any) {
    console.log("can't find quickly select, try another way");
    await page.click('div[role="presentation"]:has-text("Chat")');
    console.log("open quick select");
    await page.click('div[role="presentation"]:has-text("Chat")');
    await frame?.click('div.cke_textarea_inline[role="textbox"]');
    console.log("select: ", command);
    await frame?.click(`div.ui-list__itemheader:has-text("${command}")`);
  }
}

export async function validateTeamsWorkbench(page: Page, displayName: string) {
  try {
    console.log("Load debug scripts");
    const frameElementHandle = await page.waitForSelector(
      "iframe.embedded-iframe"
    );
    const frame = await frameElementHandle?.contentFrame();
    await frame?.click('button:has-text("Load debug scripts")');
    console.log("Debug scripts loaded");
  } catch (error) {
    await page.screenshot({
      path: getPlaywrightScreenshotPath("error"),
      fullPage: true,
    });
    throw error;
  }
}

export async function validateSpfx(page: Page, displayName: string) {
  try {
    const frameElementHandle = await page.waitForSelector(
      "iframe.embedded-iframe"
    );
    const frame = await frameElementHandle?.contentFrame();
    await frame?.waitForSelector(`text=${displayName}`);
  } catch (error) {
    await page.screenshot({
      path: getPlaywrightScreenshotPath("error"),
      fullPage: true,
    });
    throw error;
  }
}

export async function switchToTab(page: Page) {
  try {
    await page.click('a:has-text("Personal Tab")');
  } catch (error) {
    await page.screenshot({
      path: getPlaywrightScreenshotPath("error"),
      fullPage: true,
    });
    throw error;
  }
}

export async function validateContact(page: Page, displayName: string) {
  try {
    console.log("start to verify contact");
    await page.waitForTimeout(Timeout.shortTimeLoading);
    const frameElementHandle = await page.waitForSelector(
      "iframe.embedded-page-content"
    );
    const frame = await frameElementHandle?.contentFrame();
    try {
      console.log("dismiss message");
      await page
        .click('button:has-text("Dismiss")', {
          timeout: Timeout.playwrightDefaultTimeout,
        })
        .catch(() => {});
    } catch (error) {
      console.log("no message to dismiss");
    }
    try {
      const startBtn = await frame?.waitForSelector('button:has-text("Start")');
      await RetryHandler.retry(async () => {
        console.log("Before popup");
        const [popup] = await Promise.all([
          page
            .waitForEvent("popup")
            .then((popup) =>
              popup
                .waitForEvent("close", {
                  timeout: Timeout.playwrightConsentPopupPage,
                })
                .catch(() => popup)
            )
            .catch(() => {}),
          startBtn?.click(),
        ]);
        console.log("after popup");

        if (popup && !popup?.isClosed()) {
          await popup
            .click('button:has-text("Reload")', {
              timeout: Timeout.playwrightConsentPageReload,
            })
            .catch(() => {});
          await popup.click("input.button[type='submit'][value='Accept']");
        }

        await frame?.waitForSelector(`div:has-text("${displayName}")`);
      });
      page.waitForTimeout(1000);

      // verify add person
      await addPerson(frame, displayName);
      // verify delete person
      await delPerson(frame, displayName);
    } catch (e: any) {
      console.log(`[Command not executed successfully] ${e.message}`);
      await page.screenshot({
        path: getPlaywrightScreenshotPath("error"),
        fullPage: true,
      });
      throw e;
    }

    await RetryHandler.retry(async () => {}, 2);

    await page.waitForTimeout(Timeout.shortTimeLoading);
  } catch (error) {
    await page.screenshot({
      path: getPlaywrightScreenshotPath("error"),
      fullPage: true,
    });
    throw error;
  }
}

export async function validateGraphConnector(page: Page, displayName: string) {
  try {
    console.log("start to verify contact");
    await page.waitForTimeout(Timeout.shortTimeLoading);
    const frameElementHandle = await page.waitForSelector(
      "iframe.embedded-page-content"
    );
    const frame = await frameElementHandle?.contentFrame();
    try {
      const startBtn = await frame?.waitForSelector('button:has-text("Start")');
      await RetryHandler.retry(async () => {
        console.log("Before popup");
        const [popup] = await Promise.all([
          page
            .waitForEvent("popup")
            .then((popup) =>
              popup
                .waitForEvent("close", {
                  timeout: Timeout.playwrightConsentPopupPage,
                })
                .catch(() => popup)
            )
            .catch(() => {}),
          startBtn?.click(),
        ]);
        console.log("after popup");

        if (popup && !popup?.isClosed()) {
          await popup
            .click('button:has-text("Reload")', {
              timeout: Timeout.playwrightConsentPageReload,
            })
            .catch(() => {});
          await popup.click("input.button[type='submit'][value='Accept']");
        }

        await frame?.waitForSelector(`div:has-text("${displayName}")`);
      });
      page.waitForTimeout(1000);
    } catch (e: any) {
      console.log(`[Command not executed successfully] ${e.message}`);
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

export async function validateMsg(page: Page) {
  try {
    const frameElementHandle = await page.waitForSelector(
      "iframe.embedded-page-content"
    );
    const frame = await frameElementHandle?.contentFrame();
    await frame?.waitForSelector("div.ui-box");
    console.log("start to validate msg");
    try {
      await frame?.waitForSelector('input[aria-label="Your search query"]');
    } catch (error) {
      console.log("no search box to validate msg.");
      return;
    }
    //input keyword
    const searchKeyword = "teamsfx";
    //check
    await frame?.fill('input[aria-label="Your search query"]', searchKeyword);
    console.log("Check if npm list showed");
    await frame?.waitForSelector('ul[datatid="app-picker-list"]');
    console.log("[search for npm packages success]");
  } catch (error) {
    console.log("[search for npm packages faild,Unable to reach app]");
    await page.screenshot({
      path: getPlaywrightScreenshotPath("error"),
      fullPage: true,
    });
    throw error;
  }
}

export async function validateBasicDashboardTab(page: Page) {
  try {
    console.log("start to verify dashboard tab");
    const frameElementHandle = await page.waitForSelector(
      "iframe.embedded-iframe"
    );
    const frame = await frameElementHandle?.contentFrame();
    await frame?.waitForSelector("span:has-text('Your List')");
    await frame?.waitForSelector("span:has-text('Your chart')");
    await frame?.waitForSelector("button:has-text('View Details')");
    console.log("Dashboard tab loaded successfully");
  } catch (error) {
    await page.screenshot({
      path: getPlaywrightScreenshotPath("error"),
      fullPage: true,
    });
    throw error;
  }
}

export async function validateDashboardTab(page: Page) {
  try {
    console.log("start to verify dashboard tab");
    const frameElementHandle = await page.waitForSelector(
      "iframe.embedded-iframe"
    );
    const frame = await frameElementHandle?.contentFrame();
    await frame?.waitForSelector("span:has-text('Area chart')");
    await frame?.waitForSelector("span:has-text('Your upcoming events')");
    await frame?.waitForSelector("span:has-text('Your tasks')");
    await frame?.waitForSelector("span:has-text('Team collaborations')");
    await frame?.waitForSelector("span:has-text('Your documents')");
    console.log("Dashboard tab loaded successfully");
  } catch (error) {
    await page.screenshot({
      path: getPlaywrightScreenshotPath("error"),
      fullPage: true,
    });
    throw error;
  }
}

export async function validateNotificationTimeBot(page: Page) {
  try {
    const frameElementHandle = await page.waitForSelector(
      "iframe.embedded-page-content"
    );
    const frame = await frameElementHandle?.contentFrame();
    await frame?.waitForSelector("div.ui-box");
    await RetryHandler.retry(async () => {
      await frame?.waitForSelector(
        `p:has-text("This is a sample time-triggered notification")`
      );
      console.log("verify noti time-trigger bot successfully!!!");
    }, 2);
    console.log("User received notification");
  } catch (error) {
    await page.screenshot({
      path: getPlaywrightScreenshotPath("error"),
      fullPage: true,
    });
    throw error;
  }
}

export async function validateAdaptiveCard(
  page: Page,
  context: SampledebugContext,
  env: "local" | "dev" = "local"
) {
  try {
    const frameElementHandle = await page.waitForSelector(
      "iframe.embedded-page-content"
    );
    const frame = await frameElementHandle?.contentFrame();
    await frame?.waitForSelector("div.ui-box");
    await page
      .click('button:has-text("Dismiss")', {
        timeout: Timeout.playwrightDefaultTimeout,
      })
      .catch(() => {});
    await RetryHandler.retry(async () => {
      try {
        // send post request to bot
        console.log("Post request sent to bot");
        let url: string;
        if (env === "dev") {
          const endpointFilePath = path.join(
            context.projectPath,
            "env",
            ".env.dev"
          );
          // read env file
          const endpoint = fs.readFileSync(endpointFilePath, "utf8");
          const devEnv = dotenvUtil.deserialize(endpoint);
          url =
            devEnv.obj["BOT_FUNCTION_ENDPOINT"] + "/api/default-notification";
        } else {
          url = "http://127.0.0.1:3978/api/default-notification";
        }
        console.log(url);
        await axios.post(url);
        await frame?.waitForSelector('p:has-text("New Event Occurred!")');
        console.log("Successfully sent notification");
      } catch (e: any) {
        console.log(`[ Not receive response! ] ${e.message}`);
        await page.screenshot({
          path: getPlaywrightScreenshotPath("error"),
          fullPage: true,
        });
        throw e;
      }
    }, 2);
  } catch (error) {
    await page.screenshot({
      path: getPlaywrightScreenshotPath("error"),
      fullPage: true,
    });
    throw error;
  }
}

export async function addPerson(
  frame: Frame | null,
  displayName: string
): Promise<void> {
  console.log(`add person: ${displayName}`);
  const input = await frame?.waitForSelector("input#people-picker-input");
  await input?.click();
  await input?.type(displayName);
  const item = await frame?.waitForSelector(`span:has-text("${displayName}")`);
  await item?.click();
  await frame?.waitForSelector(
    `div.table-area div.line1:has-text("${displayName}")`
  );
}

export async function delPerson(
  frame: Frame | null,
  displayName: string
): Promise<void> {
  console.log(`delete person: ${displayName}`);
  await frame?.waitForSelector(
    `li div.details.small div:has-text("${displayName}")`
  );

  const closeBtn = await frame?.waitForSelector('li div[role="button"]');
  await closeBtn?.click();
  await frame?.waitForSelector(
    `div.table-area div.line1:has-text("${displayName}")`,
    { state: "detached" }
  );
}
