// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

/**
 * this is a lib for Azure DevOps TestPlan API.
 *
 * {@link https://docs.microsoft.com/en-us/rest/api/azure/devops?view=azure-devops-rest-6.1&viewFallbackFrom=azure-devops-rest-6.0}.
 */

import * as axios from "axios";
import * as dotenv from "dotenv";
import * as fs from "fs-extra";
import * as semver from "semver";

dotenv.config();

/**
 * Mochawesome reporter result.
 * {@link https://github.com/adamgruber/mochawesome}
 */
enum MochaTestState {
  passed = "passed",
  pending = "pending",
  failed = "failed",
}

interface MochaTestContext {
  testPlanCaseId?: number;
}

interface MochaTest {
  title: string;
  fullTitle: string;
  err: any;
  context: string;
  extractedContext?: MochaTestContext;
  state: MochaTestState;
}

/**
 * TestPlan, TestSuite and TestPoint are basic structures for ADO Test Plan.
 * Currently, we don't need to care about TestCase
 */
interface TestPlan {
  id: number;
  name: string;
}

interface TestSuite {
  id: number;
  name: string;
  plan: TestPlan;
}

enum TestPointOutCome {
  passed = "passed",
  failed = "failed",
}

interface TestPoint {
  id: number;
  testPlan: TestPlan;
  testSuite: TestSuite;
  testCaseReference: {
    id: number;
    name: string;
    state: string;
  };
  results?: {
    outcome: TestPointOutCome;
  };
}

interface TestCase {
  testPlan: TestPlan;
  testSuite: TestSuite;
  workItem: {
    id: number;
    name: string;
    workItemFields: Record<string, any>[];
  };
}

/**
 * All these definations are for internal.
 */
enum TestPlanType {
  cli = "cli",
  vscode = "vscode",
}

const AutoTeamsfxPlanPrefix = "[auto] teamsfx@";

function TestPlanName(version: string): string {
  const tag = `${semver.major(version)}.${semver.minor(version)}.${semver.patch(
    version
  )}`;
  return AutoTeamsfxPlanPrefix + tag;
}

/**
 * if we can't get all test plans in one http request, it'll return a continuationToken as a cursor,
 * which we can use it for the next http call.
 * {@link https://docs.microsoft.com/en-us/rest/api/azure/devops/testplan/test%20%20plans/list?view=azure-devops-rest-6.1}
 */
type TestPlanPagenation = Pagenation<TestPlan[]>;
type TestSuitePagenation = Pagenation<TestSuite[]>;
type TestPointPagenation = Pagenation<TestPoint[]>;

interface Pagenation<T> {
  success: boolean;
  v?: T;
  continuationToken?: string;
}

const BaseURL =
  "https://dev.azure.com/msazure/Microsoft Teams Extensibility/_apis/testplan";

const CommonHeaders = {
  "Content-Type": "application/json",
  Accept: "application/json;api-version=6.1-preview",
};

/**
 * ADO TestPlan SDK
 */
class ADOTestPlanClient {
  private static client: axios.AxiosInstance = axios.default.create({
    baseURL: BaseURL,
    timeout: 1000 * 100,
    headers: CommonHeaders,
    auth: {
      username: "",
      password: process.env.ADO_TOKEN ?? "",
    },
  });

  public static async reportTestResult(
    points: TestPoint[],
    cases: MochaTest[]
  ): Promise<void> {
    if (points.length == 0) {
      return;
    }
    const planId = points[0].testPlan.id;
    const suitePoints: Map<number, TestPoint[]> = new Map();
    for (const point of points) {
      for (const c of cases) {
        if (
          !c.extractedContext ||
          c.extractedContext.testPlanCaseId !== point.testCaseReference.id
        ) {
          continue;
        }

        switch (c.state) {
          case MochaTestState.passed: {
            point.results = { outcome: TestPointOutCome.passed };
            break;
          }
          case MochaTestState.failed: {
            point.results = { outcome: TestPointOutCome.failed };
            break;
          }
          default:
            point.results = { outcome: TestPointOutCome.failed };
            break;
        }

        if (suitePoints.has(point.testSuite.id)) {
          suitePoints.get(point.testSuite.id)!.push(point);
        } else {
          suitePoints.set(point.testSuite.id, [point]);
        }
      }
    }

    for (const [suite, points] of suitePoints) {
      await this.updateTestPoints(planId, suite, points);
    }
  }

  public static async AllTestPoints(planID: number): Promise<TestPoint[]> {
    const suites = await this.AllTestSuites(planID);
    const points: TestPoint[] = [];
    for (const i in suites) {
      const result = await this.ListTestPoints(planID, suites[i].id);
      if (result.success) {
        points.push(...result.v!);
      }
    }
    return points;
  }

  private static async ListTestPoints(
    planID: number,
    suiteID: number,
    continuationToken?: string
  ): Promise<TestPointPagenation> {
    try {
      const response = await ADOTestPlanClient.client.get(
        `/Plans/${planID}/Suites/${suiteID}/TestPoint`,
        {
          params: {
            continuationtoken: continuationToken,
          },
        }
      );
      return {
        success: true,
        v: response.data["value"],
        continuationToken: response.headers["x-ms-continuationtoken"],
      };
    } catch (error) {
      console.log(error);
      return {
        success: false,
      };
    }
  }

  public static async AllTestCases(planID: number): Promise<TestCase[]> {
    const suites = await this.AllTestSuites(planID);
    const points: TestCase[] = [];
    for (const i in suites) {
      const result = await this.ListTestCases(planID, suites[i].id);
      if (result.success) {
        points.push(...result.v!);
      }
    }
    return points;
  }

  private static async ListTestCases(
    planID: number,
    suiteID: number,
    continuationToken?: string
  ) {
    try {
      const response = await ADOTestPlanClient.client.get(
        `/Plans/${planID}/Suites/${suiteID}/TestCase`,
        {
          params: {
            continuationtoken: continuationToken,
          },
        }
      );
      return {
        success: true,
        v: response.data["value"],
        continuationToken: response.headers["x-ms-continuationtoken"],
      };
    } catch (error) {
      console.log(error);
      return {
        success: false,
      };
    }
  }

  public static async AllTestSuites(planID: number): Promise<TestSuite[]> {
    let continuationToken: string | undefined;
    const suites: TestSuite[] = [];
    while (true) {
      try {
        const result = await this.ListTestSuites(planID, continuationToken);
        if (result.success) {
          suites.push(...result.v!);
        } else {
          return [];
        }

        if (result.continuationToken) {
          continuationToken = result.continuationToken;
        } else {
          break;
        }
      } catch (error) {
        return [];
      }
    }
    return suites;
  }

  private static async ListTestSuites(
    planID: number,
    continuationToken?: string
  ): Promise<TestSuitePagenation> {
    try {
      const response = await ADOTestPlanClient.client.get(
        `/Plans/${planID}/suites`,
        {
          params: {
            continuationtoken: continuationToken,
          },
        }
      );
      return {
        success: true,
        v: response.data["value"],
        continuationToken: response.headers["x-ms-continuationtoken"],
      };
    } catch (error) {
      console.log(error);
      return {
        success: false,
      };
    }
  }

  private static async updateTestPoints(
    planID: number,
    suiteID: number,
    testPoints: TestPoint[]
  ): Promise<boolean> {
    const argus: { id: number; results: { outcome: TestPointOutCome } }[] = [];
    for (const i in testPoints) {
      argus.push({ id: testPoints[i].id, results: testPoints[i].results! });
    }
    try {
      const response = await ADOTestPlanClient.client.patch(
        `/Plans/${planID}/Suites/${suiteID}/TestPoint`,
        argus,
        {
          params: {
            includePointDetails: true,
            returnIdentityRef: true,
          },
        }
      );
      console.log(response);
      return true;
    } catch (error) {
      console.log(error);
      return false;
    }
  }

  public static async AllTestPlans(): Promise<TestPlan[]> {
    let continuationToken: string | undefined;
    const plans: TestPlan[] = [];
    while (true) {
      try {
        const result = await this.ListTestPlans(continuationToken);
        if (result.success) {
          plans.push(...result.v!);
        } else {
          return [];
        }

        if (result.continuationToken) {
          continuationToken = result.continuationToken;
        } else {
          break;
        }
      } catch (error) {
        return [];
      }
    }
    return plans;
  }

  private static async ListTestPlans(
    continuationToken?: string
  ): Promise<TestPlanPagenation> {
    try {
      const response = await ADOTestPlanClient.client.get("/plans", {
        params: {
          filterActivePlans: true,
          continuationtoken: continuationToken,
        },
      });
      return {
        success: true,
        v: response.data["value"],
        continuationToken: response.headers["x-ms-continuationtoken"],
      };
    } catch (error) {
      console.log(error);
      return {
        success: false,
      };
    }
  }

  public static async CloneTestPlan(name: string): Promise<TestPlan> {
    let id = 0;
    let sourceID = 0;
    if (name.indexOf(AutoTeamsfxPlanPrefix) >= 0) {
      sourceID = process.env["AUTO_TEST_PLAN_ID"] as unknown as number;
    }

    try {
      const response = await ADOTestPlanClient.client.post(
        "/Plans/CloneOperation",
        {
          cloneOptions: {
            copyAllSuites: true,
            CopyAncestorHierarchy: true,
            cloneRequirements: false,
          },
          destinationTestPlan: {
            areaPath: "Microsoft Teams Extensibility",
            iteration: "Microsoft Teams Extensibility",
            name: name,
            project: "Microsoft Teams Extensibility",
          },
          sourceTestPlan: { id: sourceID, suiteIds: [sourceID + 1] },
        },
        {
          params: {
            deepClone: false,
          },
        }
      );
      id = response.data["destinationTestPlan"]["id"];
    } catch (error) {
      console.log(error);
      throw error;
    }
    return {
      id: id,
      name: name,
    };
  }
}

/**
 * subcommand list
 *
 * - obtain: create or get the target version test plan
 *  - pattern: ts-node testplan.ts obtain [TestPlanType] [Version]
 *  - sample: ts-node testplan.ts obtain cli 3.0.0
 *
 * - archive:archive test plan suites & cases
 *  - pattern: ts-node testplan.ts archive [TestPlanID]
 *  - sample: ts-node testplan.ts archive 10445806
 *
 * - report: report mocha result file to sync test result
 *  - pattern: ts-node testplan.ts upload [TestPlanArchivedFile] [MochaReportFile]
 *  - sample: ts-node testplan.ts report ./testplan.json ./mochawesome.json
 */
async function main() {
  switch (process.argv[2]) {
    case "obtain": {
      if (process.argv.length !== 5) {
        throw new Error("invalid param length");
      }

      const tpt = process.argv[3] as TestPlanType;
      const version = process.argv[4];

      const tpn = TestPlanName(version); // [AUTO] teamsfx@X.X.X

      const allTestPlans = await ADOTestPlanClient.AllTestPlans();

      for (const i in allTestPlans) {
        if (allTestPlans[i].name == tpn) {
          console.log(allTestPlans[i].id);
          return allTestPlans[i];
        }
      }

      const testPlan = await ADOTestPlanClient.CloneTestPlan(tpn);
      console.log(testPlan.id);

      break;
    }

    case "archive": {
      if (process.argv.length !== 4) {
        throw new Error("invalid param length");
      }

      const testPlanId = Number(process.argv[3]);

      if (isNaN(testPlanId)) {
        throw new Error("invalid test plan id");
      }

      const points = await ADOTestPlanClient.AllTestPoints(testPlanId);
      await fs.writeJSON("testplan.json", points, { spaces: 2 });

      break;
    }

    case "report": {
      if (process.argv.length != 5) {
        throw new Error("invalid param length");
      }

      if (!(await fs.pathExists(process.argv[3]))) {
        throw new Error("invalid test plan file path");
      }

      if (!(await fs.pathExists(process.argv[4]))) {
        throw new Error("invalid mocha result file path");
      }

      const points = (await fs.readJson(process.argv[3])) as TestPoint[];

      const results = (await fs.readJson(process.argv[4])).results;
      const cases: MochaTest[] = [];

      for (const result of results) {
        for (const suite of result.suites) {
          for (const test of suite.tests) {
            if (test.context) {
              try {
                const c: MochaTestContext = JSON.parse(
                  JSON.parse(test.context)
                );
                test.extractedContext = c;
              } catch {
                continue;
              }
            }
            cases.push(test);
          }
        }
      }

      ADOTestPlanClient.reportTestResult(points, cases);

      break;
    }

    default: {
      throw new Error(`unknow command: ${process.argv[2]}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(-1);
});
