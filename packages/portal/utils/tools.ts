import {
  CaseSchema,
  FailuresSchema,
  reportNameEnum,
  ReportSchema,
  TestCaseSchema,
  testStatus,
  VersionSchema,
} from '~/utils/schema.ts';
import { config } from 'dotenv';
//     statusIcon = 'check_circle'
//     statusIcon = 'report_problem'
//     statusIcon = 'highlight_off'

export const formatName = (name: string | undefined) => {
  // split firstname and lastname
  if (name) {
    const [firstName, lastName] = name.toUpperCase().split(' ');
    if (lastName) {
      return [firstName[0], lastName[0]].join('');
    } else {
      return firstName[0];
    }
  }
  return 'UN';
};

export const changeStatusIcon = (caseItems: CaseSchema[]) => {
  if (caseItems.length != 0) {
    for (let i = 0; i < caseItems.length; i++) {
      if (caseItems[i].status === testStatus.operational) {
        caseItems[i].statusIcon = 'check_circle';
        caseItems[i].statusIconColor = 'green';
      } else if (caseItems[i].status === testStatus.panic) {
        caseItems[i].statusIcon = 'highlight_off';
        caseItems[i].statusIconColor = 'red';
      } else {
        caseItems[i].statusIcon = 'report_problem';
        caseItems[i].statusIconColor = 'orange';
      }
    }
    return caseItems;
  }
  return [];
};

export const getEnv = (key: string) => {
  if (Deno.env.get(key)) {
    return Deno.env.get(key) as string;
  } else {
    config({
      path: './portal/.env',
      export: true,
    });
    return Deno.env.get(key) as string;
  }
};

export const verifyToken = (headers: Headers) => {
  const token = headers.get('authorization')?.split(' ')[1];
  if (token === getEnv('ACCESS_TOKEN')) {
    return true;
  } else {
    return false;
  }
};

/*
testStatus = "operational" | "degraded_performance" | "partial_outage" | "major_outage" | "out_of_data"
failures:
0% => 'operational' = 0
<20% => "degraded_performance" = 1
<=50% => "partial_outage" = 2
>50% => "major_outage" = 3
mochawesome.results[0].suites[0].failures.length/
mochawesome.results[0].suites[0].tests.length * 100 %
0 1 2 3
*/

export const getReportStatus = (reportList: ReportSchema[]) => {
  let totalStatus = 0;
  // console.log(reportList)
  for (let j = 0; j < reportList.length; j++) {
    let status = 0;
    // get failures cases status
    const testCaseFailures: FailuresSchema[] = [];
    if (
      reportList[j].reportId === '01' || reportList[j].reportId === '02' ||
      reportList[j].reportId === '05'
    ) {
      for (let i = 0; i < reportList[j].reportCases.length; i++) {
        const mochawesome = reportList[j].reportCases[i].mochawesome;
        const failures = mochawesome?.stats?.failures || 0;
        const totalTest = mochawesome?.stats?.tests || 0;
        const percentage = failures / totalTest * 100;
        const failureItem = {
          author: formatName(reportList[j].reportCases[i].git.author),
          email: reportList[j].reportCases[i].git.author,
          failureCases: [],
          failures: failures,
          url: reportList[j].reportCases[i].github?.caseURL,
          jobId: reportList[j].reportCases[i].github?.jobId,
          runId: reportList[j].reportCases[i].github?.runId,
        };

        if (failureItem.failures > 0) {
          addFailureCases(testCaseFailures, failureItem);
        }

        if (percentage === 0) {
          reportList[j].reportCases[i].status = testStatus.operational;
          status += 0;
        } else if (percentage <= 20) {
          reportList[j].reportCases[i].status = testStatus.partial_failed;
          status += 1;
        } else if (percentage <= 50) {
          reportList[j].reportCases[i].status = testStatus.partial_passed;
          status += 2;
        } else {
          reportList[j].reportCases[i].status = testStatus.panic;
          status += 3;
        }
      }
      status = Math.ceil(status / reportList[j].reportCases.length);
      reportList[j].reportResultStatus = !status
        ? testStatus.operational
        : status === 1
        ? testStatus.partial_failed
        : status === 2
        ? testStatus.partial_passed
        : testStatus.panic;
      totalStatus += status;
      reportList[j].testCaseFailures = testCaseFailures;
    } else if (reportList[j].reportId === '04') {
      let failures = 0;
      for (let i = 0; i < reportList[j].reportCases.length; i++) {
        const azureTestResult = reportList[j].reportCases[i].azureTestResult;
        const azure = reportList[j].reportCases[i].azure;
        failures += azureTestResult?.outcome === 'Failed' ? 1 : 0;

        const failureItem = {
          author: formatName(reportList[j].reportCases[i].git.author),
          email: reportList[j].reportCases[i].git.author,
          failureCases: [],
          failures: 1,
          url: azure?.caseURL,
          runId: azureTestResult?.testRun.id,
        };
        if (azureTestResult?.outcome === 'Failed') {
          addFailureCases(testCaseFailures, failureItem);
        }
      }
      const totalTest = reportList[j].reportCases.length;
      const percentage = failures / totalTest * 100;
      if (percentage === 0) {
        reportList[j].reportResultStatus = testStatus.operational;
      } else if (percentage <= 20) {
        reportList[j].reportResultStatus = testStatus.partial_failed;
      } else if (percentage <= 50) {
        reportList[j].reportResultStatus = testStatus.partial_passed;
      } else {
        reportList[j].reportResultStatus = testStatus.panic;
      }

      reportList[j].testCaseFailures = testCaseFailures;
    }
  }
  totalStatus = Math.ceil(totalStatus / reportList.length);
  return {
    totalStatus: !totalStatus
      ? testStatus.operational
      : totalStatus === 1
      ? testStatus.partial_failed
      : totalStatus === 2
      ? testStatus.partial_passed
      : testStatus.panic as testStatus,
    reportList,
  };
};

export const getToday = () => {
  const date = new Date();
  const year = date.getFullYear().toString();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const todayDate = `${year}-${month}-${day}`;
  return todayDate;
};

export const initItemCards = (reportList: ReportSchema[]) => {
  const itemCards: { [key: string]: any }[] = [{}, {}, {}, {}, {}, {}];
  for (let i = 0; i < reportList.length; i++) {
    switch (reportList[i].reportId) {
      case '01':
        itemCards[0] = reportList[i];
        break;
      case '02':
        itemCards[1] = reportList[i];
        break;
      case '03':
        itemCards[2] = reportList[i];
        break;
      case '04':
        itemCards[3] = reportList[i];
        break;
      case '05':
        itemCards[4] = reportList[i];
        break;
      case '06':
        itemCards[5] = reportList[i];
        break;
    }
  }
  for (let i = 0; i < itemCards.length; i++) {
    if (!itemCards[i].reportId) {
      //  init out of data
      itemCards[i].reportId = '0' + (i + 1);
      itemCards[i].reportResultStatus = testStatus.out_of_data;
      itemCards[i].reportName =
        reportNameEnum[itemCards[i].reportId as keyof typeof reportNameEnum];
      itemCards[i].failedCasesNumber = 0;
    } else {
      // count git action slow cases
      if (itemCards[i].reportId === '01' || itemCards[i].reportId === '02') {
        let slowMethods = 0;
        for (let j = 0; j < itemCards[i].reportCases.length; j++) {
          slowMethods =
            parseInt(itemCards[i].reportCases[j].github.slowMethod) +
            slowMethods;
        }
        itemCards[i].slowMethods = slowMethods;
      } else {
        itemCards[i].slowMethods = -1;
      }
    }
  }
  return itemCards;
};

export const updateRuntime = (testCase: CaseSchema) => {
  const filename = testCase.mochawesome?.results[0].suites[0].file;
  if (testCase.github) {
    // update coreVersion: find the 'v3' in the filename
    filename?.includes('v3')
      ? testCase.github.coreVersion = 'V3'
      : testCase.github.coreVersion = 'V1/V2';
    // update targetType: find 'ts/js' in the filename
    filename?.includes('ts')
      ? testCase.github.targetType = 'TS'
      : filename?.includes('js')
      ? testCase.github.targetType = 'JS'
      : '.NET';
  }
  return testCase.github;
};

const addFailureCases = (
  failureCasesList: FailuresSchema[],
  failureCase: {
    author: string;
    failures: number;
    email: string | undefined;
    url: string | undefined;
    jobId?: string | undefined;
    runId: string | undefined;
  },
) => {
  for (let i = 0; i < failureCasesList.length; i++) {
    if (failureCasesList[i].author === failureCase.author) {
      failureCasesList[i].failureCases.push(failureCase);
      return failureCasesList;
    }
  }
  failureCasesList.push({
    author: failureCase.author,
    email: failureCase.email,
    failureCases: [failureCase],
  });
};

export const parseAuthor = (context: string | undefined | null) => {
  if (context) {
    try {
      const JSONdata = JSON.parse(JSON.parse(context));
      return JSONdata.author;
    } catch (err) {
      console.log(err);
      return '';
    }
  } else {
    return '';
  }
};

export const computeTime = (duration: number | undefined) => {
  if (duration && typeof duration === 'number') {
    const time = duration / 1000;
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);
    return `${hours === 0 ? '' : hours + 's'} ${
      minutes === 0 && hours === 0 ? '' : minutes + 'm'
    } ${
      seconds === 0 && minutes === 0 && hours === 0
        ? duration + 'ms'
        : seconds + 's'
    }`;
  } else return 'undefined';
};

export const initTestCase = (
  reportId: keyof typeof reportNameEnum,
  reportCases: CaseSchema[],
) => {
  if (reportId === '05') {
    const testCaseList = [];
    for (let k = 0; k < reportCases.length; k++) {
      const { mochawesome, github, basic } = reportCases[k];
      // seperate test cases
      const testCases = [];
      if (mochawesome && github) {
        for (let i = 0; i < mochawesome.results[0].suites.length; i++) {
          for (
            let j = 0;
            j < mochawesome.results[0].suites[i].tests.length;
            j++
          ) {
            testCases.push({
              title: mochawesome.results[0].suites[i].tests[j].title,
              suiteName: mochawesome.results[0].suites[i].title,
              testResult: mochawesome.results[0].suites[i].tests[j].state,
              duration: mochawesome.results[0].suites[i].tests[j].duration,
              os: github.os,
              nodeVersion: github.nodeVersion,
              on: github.on,
              caseURL: github.caseURL,
              runId: github.runId,
              jobId: github.jobId,
              author: basic.author,
              statusIcon:
                mochawesome.results[0].suites[i].tests[j].state === 'passed'
                  ? 'check_circle'
                  : 'highlight_off',
              statusIconColor:
                mochawesome.results[0].suites[i].tests[j].state === 'passed'
                  ? 'green'
                  : 'red',
            });
          }
        }
      }
      testCaseList.push(testCases);
    }
    return {
      reportName: reportNameEnum[reportId],
      reportId: reportId,
      reportCases: reportCases,
      testCaseList,
    };
  } else if (reportId === '01' || reportId === '02') {
    const testCaseList: { runId: string; testCase: TestCaseSchema[] }[] = [];
    let testCase: TestCaseSchema;
    const failedCaseList: CaseSchema[] = [];
    for (let k = 0; k < reportCases.length; k++) {
      const { mochawesome, github, basic } = reportCases[k];
      const runId = github?.runId;
      // create failed list
      // if (mochawesome && mochawesome.stats.failures > 0) {
      //   failedCaseList.push(reportCases[k])
      // }

      // seperate test cases
      testCase = {
        title: mochawesome?.results[0].suites[0].file || '',
        testResult:
          mochawesome && mochawesome.results[0].suites[0].failures.length > 0
            ? 'Failed'
            : 'Passed',
        duration: mochawesome?.results[0].suites[0].duration || 0,
        os: github?.os,
        nodeVersion: github?.nodeVersion,
        on: github?.on || '',
        caseURL: github?.caseURL,
        runId: github?.runId || '',
        jobId: github?.jobId || '',
        author: basic.author,
        statusIcon:
          mochawesome && mochawesome.results[0].suites[0].failures.length === 0
            ? 'check_circle'
            : 'highlight_off',
        statusIconColor:
          mochawesome && mochawesome.results[0].suites[0].failures.length === 0
            ? 'green'
            : 'red',
        targetType: github?.targetType,
        coreVersion: github?.coreVersion,
        slowMethod: github?.slowMethod,
        releaseVersion: github?.releaseVersion,
      };
      if (testCase.testResult === 'Failed') {
        failedCaseList.push(reportCases[k]);
      }
      let flag = true;
      testCaseList.forEach((item) => {
        if (item.runId === runId && mochawesome && github) {
          item.testCase.push(testCase);
          flag = false;
        }
      });
      if (flag && mochawesome && github) {
        testCaseList.push({ runId: runId || '', testCase: [testCase] });
      }
    }
    return {
      reportName: reportNameEnum[reportId],
      reportId: reportId,
      reportCases: reportCases,
      testCaseList,
      failedCaseList,
    };
  } else {
    return {
      reportName: reportNameEnum[reportId],
      reportId: reportId,
      reportCases: reportCases,
    };
  }
};

export const formatVersionList = (versionList: VersionSchema[]) => {
  const sprintList: {
    title: string;
    versionList: { title: string; url: string; id: string }[];
  }[] = [];
  const cliBase = 'https://www.npmjs.com/package/@microsoft/teamsfx-cli/v/';
  const vsBase =
    'https://github.com/OfficeDev/TeamsFx/releases/tag/ms-teams-vscode-extension%40';
  for (let i = 0; i < versionList.length; i++) {
    const { mainVersion, minVersion, sprint, app, _id } = versionList[i];
    let flag = true;
    sprintList.forEach((item) => {
      if (item.title === sprint) {
        item.versionList.push({
          id: _id,
          title: app === 'cli'
            ? `CLI@${mainVersion}${
              (minVersion === 'formal' || minVersion === '')
                ? ''
                : '-' + minVersion
            }`
            : `VSCode Extension@${mainVersion}${
              (minVersion === 'formal' || minVersion === '')
                ? ''
                : '-' + minVersion
            }`,
          url: app === 'cli'
            ? cliBase + mainVersion +
              ((minVersion === 'formal' || minVersion === '')
                ? ''
                : '-' + minVersion)
            : vsBase + mainVersion +
              ((minVersion === 'formal' || minVersion === '')
                ? ''
                : '-' + minVersion),
        });
        flag = false;
      }
    });
    if (flag) {
      const sprintItem = {
        title: sprint,
        versionList: [
          {
            id: _id,
            title: app === 'cli'
              ? `CLI@${mainVersion}${
                (minVersion === 'formal' || minVersion === '')
                  ? ''
                  : '-' + minVersion
              }`
              : `VSCode Extension@${mainVersion}${
                (minVersion === 'formal' || minVersion === '')
                  ? ''
                  : '-' + minVersion
              }`,
            url: app === 'cli'
              ? cliBase + mainVersion +
                ((minVersion === 'formal' || minVersion === '')
                  ? ''
                  : '-' + minVersion)
              : vsBase + mainVersion +
                ((minVersion === 'formal' || minVersion === '')
                  ? ''
                  : '-' + minVersion),
          },
        ],
      };
      sprintList.push(sprintItem);
    }
  }
  return sprintList.reverse();
};
