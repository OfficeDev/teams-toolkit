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

import { URL } from "url";

dotenv.config();

/**

 * Mocha json test reporter result.

 */

interface MochaTest {
  title: string;

  fullTitle: string;

  err: any;
}

/**

 * TestPlan, TestSuite and TEstPoint are basic structures for ADO Test Plan.

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
  passed = 2,

  failed = 3,
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

/**

 * All these definations are for internal.

 */

enum TestPlanType {
  cli = "cli",

  vscode = "vscode",
}

const AutoCLITestPlanPrefix = "[auto] cli@";

const AutoVSCodeTestPlanPrefix = "[auto] vscode@";

function TestPlanName(tpt: TestPlanType, version: string): string {
  const tag = `${semver.major(version)}.${semver.minor(version)}.${semver.patch(version)}`;

  switch (tpt) {
    case TestPlanType.cli:
      return AutoCLITestPlanPrefix + tag;

    case TestPlanType.vscode:
      return AutoVSCodeTestPlanPrefix + tag;
  }
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

const CLITestPlanTemplate: TestPlan = {
  id: 10445798,

  name: "CLI Test Plan Template",
};

const VSCodeTestPlanTemplate: TestPlan = {
  id: 10445806,

  name: "VSCode Test Plan Template",
};

const BaseURL: URL = new URL(
  "https://dev.azure.com/msazure/Microsoft Teams Extensibility/_apis/testplan"
);

const CommonHeaders = {
  "Content-Type": "application/json",

  Accept: "application/json;api-version=6.1-preview",
};

class ADOTestPlanClient {
  private static client: axios.AxiosInstance = axios.default.create({
    baseURL: BaseURL.toString(),

    timeout: 1000 * 100,

    headers: CommonHeaders,

    auth: {
      username: "",

      password: process.env.ADO_TOKEN ?? "",
    },
  });

  public static async reportTestResult(planID: number, tests: MochaTest[]): Promise<boolean> {
    const successSet = new Set();

    const failSet = new Set();

    for (const i in tests) {
      if (tests[i].err) {
        failSet.add(tests[i].title.trim());
      } else {
        successSet.add(tests[i].title.trim());
      }
    }

    const points = await this.AllTestPoints(planID);

    if (points.length == 0) {
      return false;
    }

    const suitePoints: Map<number, TestPoint[]> = new Map();

    for (const i in points) {
      const suiteID = points[i].testSuite.id;

      let flag = false;

      if (successSet.has(points[i].testCaseReference.name.trim())) {
        points[i].results = { outcome: TestPointOutCome.passed };

        flag = true;
      }

      if (failSet.has(points[i].testCaseReference.name.trim())) {
        points[i].results = { outcome: TestPointOutCome.failed };

        flag = true;
      }

      if (!flag) {
        continue;
      }

      if (!suitePoints.has(suiteID)) {
        suitePoints.set(suiteID, [points[i]]);
      } else {
        suitePoints.get(suiteID)!.push(points[i]);
      }
    }

    console.log(suitePoints);

    for (const [k, v] of suitePoints) {
      await this.updateTestPoint(planID, k, v);
    }

    return true;
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
      const response = await ADOTestPlanClient.client.get(`/Plans/${planID}/suites`, {
        params: {
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

  private static async updateTestPoint(
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

  public static async GetCurrentTestPlan(tpt: TestPlanType, version: string): Promise<TestPlan> {
    const tpn = TestPlanName(tpt, version);

    const allTestPlans = await this.AllTestPlans();

    for (const i in allTestPlans) {
      if (allTestPlans[i].name == tpn) {
        return allTestPlans[i];
      }
    }

    return this.CloneTestPlan(tpn);
  }

  private static async AllTestPlans(): Promise<TestPlan[]> {
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

  private static async ListTestPlans(continuationToken?: string): Promise<TestPlanPagenation> {
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

  private static async CloneTestPlan(name: string): Promise<TestPlan> {
    let id = 0;

    let sourceID = 0;

    if (name.indexOf(AutoCLITestPlanPrefix) >= 0) {
      sourceID = CLITestPlanTemplate.id;
    }

    if (name.indexOf(AutoVSCodeTestPlanPrefix) >= 0) {
      sourceID = VSCodeTestPlanTemplate.id;
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

      console.log(response.data);

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

 * @param {string}  argv[3] - mocha output file path.

 * @param {string}  argv[4] - "vscode" or "cli".

 * @param {string}  argv[5] - version of the package.

 */

async function SyncToTestPlan() {
  if (process.argv.length != 6) {
    throw new Error("invalid param length");
  }

  if (!(await fs.pathExists(process.argv[3]))) {
    throw new Error("invalid file path");
  }

  if (!Object.values(TestPlanType).includes(process.argv[4].trim() as TestPlanType)) {
    throw new Error("invalid app type");
  }

  try {
    const results = await fs.readJson(process.argv[3]);

    console.log(results);

    const testPlan = await ADOTestPlanClient.GetCurrentTestPlan(
      process.argv[4].trim() as TestPlanType,

      process.argv[5].trim()
    );

    ADOTestPlanClient.reportTestResult(testPlan.id, results.tests);
  } catch (error) {
    throw error;
  }
}

interface TestPlanStat {
  suites: number;

  points: number;
}

/**

 * @param {string}  argv[3] - "vscode" or "cli".

 */

async function getTestPlanStat(): Promise<TestPlanStat> {
  if (process.argv.length != 4) {
    throw new Error("invalid param length");
  }

  if (!Object.values(TestPlanType).includes(process.argv[3].trim() as TestPlanType)) {
    throw new Error("invalid app type");
  }

  let planID = CLITestPlanTemplate.id;

  if (process.argv[3] == TestPlanType.vscode) {
    planID = VSCodeTestPlanTemplate.id;
  }

  const points = await ADOTestPlanClient.AllTestPoints(planID);

  const suites = await ADOTestPlanClient.AllTestSuites(planID);

  return {
    points: points.length,

    suites: suites.length,
  };
}

async function main() {
  switch (process.argv[2]) {
    case "sync": {
      SyncToTestPlan().catch((err: any) => {
        throw err;
      });
    }

    case "stat": {
      getTestPlanStat()
        .then((stat: TestPlanStat) => {
          console.log(JSON.stringify(stat));
        })

        .catch((err: any) => {
          throw err;
        });
    }
  }
}

main().catch((err) => {
  console.error(err);

  process.exit(-1);
});
