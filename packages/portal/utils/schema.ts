import { ObjectId } from 'mongodb/dep';

export enum testStatus {
  operational = 'All Systems Operational',
  partial_failed = 'Partial Failed',
  partial_passed = 'Partial Passed',
  panic = 'Panic',
  out_of_data = 'Out of Data',
}

export enum reportNameEnum {
  '01' = 'CLI E2E test',
  '02' = 'VSC UI test',
  '03' = 'performance test',
  '04' = 'VS UI test',
  '05' = 'SDK E2E test',
  '06' = 'CI/CD E2E test',
}

export interface FailuresSchema {
  author: string | undefined;
  email: string | undefined;
  failure?: number;
  failureCases: {
    failures: number;
    url: string | undefined;
    jobId?: string | undefined;
    runId: string | undefined;
  }[];
}

export interface TestSchema {
  uuid: string;
  parentUUID: string;
  title: string;
  fullTitle: string;
  duration: number;
  state: 'pass' | 'fail' | 'pending' | null;
  pass: boolean;
  pending: boolean;
  fail: boolean;
  code: string;
  err: {
    message: string;
    estack: string;
    diff: string;
  };
}

export interface MetaSchema {
  mocha: {
    version: string;
  };
  mochawesome: {
    version: string;
  };
  marge: {
    version: string;
  };
}

//database schema
export interface CaseSchema {
  // from basic data
  basic: {
    author?: string;
    title?: string;
    uploadTime?: Date;
    date?: string;
    reportId: '01' | '02' | '03' | '04' | '05' | '06';
    reportName?: string;
    state: 'pass' | 'fail' | 'pending' | null;
    errMsg?: string;
  };
  // from git data
  git: {
    organization?: string;
    repository?: string;
    commit?: string;
    author?: string;
    branch?: string;
    date?: Date;
  };
  // from github data
  github?: {
    on: string;
    coreVersion?: 'V1/V2' | 'V3';
    os?: 'linux' | 'windows' | 'mac';
    nodeVersion?: 'v14' | 'v16';
    targetType?: 'TS' | 'JS' | '.NET';
    jobId: string;
    runId: string;
    caseURL?: string;
    duration?: number;
    slowMethod?: number;
    releaseVersion: string;
  };
  // from mochawesome data
  mochawesome?: MochawesomeData;
  azure?: { [key: string]: any };
  azureTestResult?: AzureSchema;
  status?: testStatus;
  testCaseFailures?: number;
  _id?: ObjectId;
  statusIcon?: string;
  statusIconColor?: string;
}

export interface ReportSchema {
  reportId: '01' | '02' | '03' | '04' | '05' | '06';
  reportName: reportNameEnum;
  reportResultStatus: testStatus;
  testCaseFailures?: FailuresSchema[];
  reportCases: CaseSchema[];
  testCaseList: { runId: string; testCase: TestCaseSchema[] }[];
}

export interface Fields {
  [key: string]: any;
}

export interface Filter {
  $ne?: null;
  [key: string]: any;
}

export interface aggregateOptions {
  $match?: Fields;
  $set?: Fields;
  $group?: Fields;
  $sort?: Fields;
  $sum?: Fields;
}

interface Hooks {
  title?: string;
  fullTitle?: string;
  timeOut?: number;
  duration?: number;
  state?: 'passed' | 'failed' | 'pending' | null;
  speed?: number | null;
  pass?: boolean;
  pending?: boolean;
  fail?: boolean;
  context?: string | null;
  code?: string;
  err?: {
    message: string;
    estack: string;
    diff: string;
  };
  uuid?: string;
  parentUUID: string;
  isHook?: boolean;
  skiped?: boolean;
}

export interface GitData {
  organization?: string;
  repository?: string;
  commit?: string;
  author?: string;
  branch?: string;
  date?: Date;
}

export interface TestCaseData {
  author?: string;
  title: string;
  uploadTime?: Date;
  reportId: '01' | '02' | '03' | '04' | '05' | '06';
  reportName?: string;
}

export interface GithubData {
  caseURL: string;
  jobId: string;
  runId: string;
  coreVersion: 'V1/V2' | 'V3';
  os: 'linux' | 'windows' | 'mac';
  nodeVersion: 'v14' | 'v16';
  targetType: 'TS' | 'JS' | '.NET';
  slowMethod: number;
  duration: number;
  on: 'schedule' | 'workflow_dispatch' | 'pull_request';
  releaseVersion?: string;
}

export interface AzureData {
  [key: string]: any;
}

export interface MochawesomeData {
  stats: {
    suites: number;
    tests: number;
    passes: number;
    pending: number;
    failures: number;
    start: string;
    end: string;
    duration: number;
    testsRegistered?: number;
    passPercent?: number;
    other?: number;
    hasOther?: boolean;
    skipped?: number;
    hasSkipped?: boolean;
  };
  results: {
    uuid: string;
    title: string;
    fullFile: string;
    file: string;
    beforeHooks?: string[];
    afterHooks?: string[];
    tests?: TestSchema[];
    suites: {
      uuid: string;
      title: string;
      fullFile: string;
      file: string;
      beforeHooks?: Hooks[];
      afterHooks?: Hooks[];
      tests: Hooks[];
      passes: string[];
      failures: string[];
      pending?: string[];
      skipped: string[];
      duration: number;
      root?: boolean;
      rootEmpty?: boolean;
      _timeout?: number;
    }[];
    passes: string[];
    failures: string[];
    pending?: string[];
    skipped?: string[];
    duration: number;
    root?: boolean;
    rootEmpty?: boolean;
    _timeout?: number;
  }[];
  meta?: {
    mocha: {
      version: string;
    };
    mochawesome: {
      options: {
        quiet: boolean;
        reoprtFilename: string;
        saveHtml: boolean;
        saveJson: boolean;
        consoleReporter: string;
        useInlineDiffs: boolean;
        code: boolean;
      };
      version: string;
    };
    marge: {
      version: string;
      options: Record<string, any> | null;
    };
  };
  author?: string;
  caseURL?: string;
  jobId?: string;
  parentRunId?: string;
  coreVersion?: 'V1/V2' | 'V3';
  os?: 'linux' | 'windows' | 'mac';
  nodeVersion?: 'v14' | 'v16';
  targetType?: 'TS/JS' | '.NET';
  slowMethod?: number;
}

export interface AzureSchema {
  id: string;
  project: {
    id: string;
    name: string;
    url: string;
  };
  startedDate: Date;
  completedDate: Date;
  durationInMs: number;
  outcome: 'Passed' | 'Failed' | 'Unknown';
  revision: number;
  runBy: {
    id: string;
    displayName: string;
    uniqueName: string;
    url: string;
    imageUrl: string;
  };
  state: 'Completed' | 'Panding' | 'InProgress';
  testCase: {
    name: string;
  };
  testRun: {
    id: string;
    name: string;
    url: string;
  };
  lastUpdatedDate: Date;
  lastUpdatedBy: {
    id: string;
    displayName: string;
    uniqueName: string;
    url: string;
    imageUrl: string;
  };
  priority: number;
  computerName: string;
  build: {
    id: string;
    name: string;
    url: string;
  };
  createdDate: Date;
  url: string;
  failureType: string;
  automatedTestStorage: string;
  automatedTestType: string;
  automatedTestTypeId: string;
  automatedTestId: string;
  area: {
    id: string;
    name: string;
    url: string;
  };
  testCaseTitle: string;
  customFields: string[];
  automatedTestName: string;
}

export interface TestCaseSchema {
  title: string;
  testResult: 'Failed' | 'Passed';
  duration: number;
  os?: string;
  nodeVersion?: string;
  on: string;
  caseURL?: string;
  runId: string;
  jobId: string;
  author?: string;
  statusIcon: string;
  statusIconColor: string;
  targetType?: string;
  coreVersion?: string;
  releaseVersion?: string;
  slowMethod: number;
  suiteName?: string;
}

export interface VersionSchema {
  sprint: string; // 'CY22-9.1', 'CY22-7.1'...
  mainVersion: string; // '1.6', '4.0.6' ...
  minVersion: string; // 'rc.0', 'alpha.2', 'formal' ...
  app: 'cli' | 'vs';
  _id: string;
}
