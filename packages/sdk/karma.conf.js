// https://github.com/karma-runner/karma-chrome-launcher
const webpackTestConfig = require("./config/webpack.test");
const karma = require("karma");
const { argv } = require("yargs");
process.env.CHROME_BIN = require("puppeteer").executablePath();
require("dotenv").config();

const karmaConfig = {
  // base path that will be used to resolve all patterns (eg. files, exclude)
  basePath: "./",

  files: getTestFiles(argv),

  // frameworks to use
  // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
  frameworks: ["mocha", "webpack"],

  // list of files / patterns to exclude
  exclude: [
    "src/apiClient/*.browser.ts",
    "src/bot/*.browser.ts",
    "src/conversation/*.browser.ts",
    "src/conversationWithCloudAdapter/*.browser.ts",
    "src/core/defaultTediousConnectionConfiguration.browser.ts",
    "src/credential/appCredential.browser.ts",
    "src/credential/onBehalfOfUserCredential.browser.ts",
    "src/messageExtension/*.browser.ts",
  ],

  // preprocess matching files before serving them to the browser
  // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
  preprocessors: {
    "**/*.ts": ["webpack", "sourcemap", "env"],
  },

  envPreprocessor: ["SDK_INTEGRATION_TEST_ACCOUNT", "SDK_INTEGRATION_TEST_AAD"],

  webpack: webpackTestConfig,

  webpackMiddleware: { quiet: true, stats: { colors: true } },

  // test results reporter to use
  // possible values: 'dots', 'progress'
  // available reporters: https://npmjs.org/browse/keyword/karma-reporter
  reporters: ["mocha", "coverage", "junit"],

  mochaReporter: {
    showDiff: true,
  },

  coverageReporter: {
    // specify a common output directory
    dir: "coverage-browser/",
    reporters: [{ type: "json", subdir: ".", file: "coverage.json" }],
  },

  junitReporter: {
    outputDir: "", // results will be saved as $outputDir/$browserName.xml
    outputFile: "test-results.browser.xml", // if included, results will be saved as $outputDir/$browserName/$outputFile
    suite: "", // suite will become the package name attribute in xml testsuite element
    useBrowserName: false, // add browser name to report and classes names
    nameFormatter: undefined, // function (browser, result) to customize the name attribute in xml testcase element
    classNameFormatter: undefined, // function (browser, result) to customize the classname attribute in xml testcase element
    properties: {}, // key value pair of properties to add to the <properties> section of the report
  },

  // web server port
  port: 9876,

  // enable / disable colors in the output (reporters and logs)
  colors: true,

  // level of logging
  // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
  logLevel: karma.config.LOG_INFO,

  // enable / disable watching file and executing tests whenever any file changes
  autoWatch: false,

  // --no-sandbox allows our tests to run in Linux without having to change the system.
  // --disable-web-security allows us to authenticate from the browser without having to write tests using interactive auth, which would be far more complex.
  browsers: ["ChromeHeadlessNoSandbox"],
  customLaunchers: {
    ChromeHeadlessNoSandbox: {
      base: "ChromeHeadless",
      flags: ["--no-sandbox", "--disable-web-security"],
    },
  },

  // Continuous Integration mode
  // if true, Karma captures browsers, runs the tests and exits
  singleRun: true,

  // Concurrency level
  // how many browser should be started simultaneous
  concurrency: 1,

  browserNoActivityTimeout: 600000,
  browserDisconnectTimeout: 10000,
  browserDisconnectTolerance: 3,

  client: {
    mocha: {
      opts: `config/mocha.browser.opts`,
    },
    // Pass through --grep option to filter the tests that run.
    args: argv.grep ? ["--grep", argv.grep] : [],
  },
};

module.exports = function (config) {
  config.set(karmaConfig);
};

function getTestFiles(argv) {
  let unitTestFiles = ["test/unit/*.spec.ts", "test/unit/browser/*.spec.ts"];
  let integrationTestFiles = ["test/e2e/browser/*.browser.spec.ts"];

  if (argv.unit) {
    return unitTestFiles;
  } else if (argv.integration) {
    return integrationTestFiles;
  } else {
    return [...unitTestFiles, ...integrationTestFiles];
  }
}
