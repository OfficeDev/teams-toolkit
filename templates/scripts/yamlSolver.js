const { writeFileSync, readFileSync, lstatSync, existsSync } = require("node:fs");
const path = require("path");
const utils = require("./utils");
const { Ext, Path } = require("./constants");
const os = require("os");

// The solver is called by the following command:
// > node yamlSolver.js <action> <constraintFilePath>

// The solver support two actions
// 1. apply the constraints to solution
// 2. verify the constraints are satisfied.
const Action = {
  APPLY: "apply",
  VERIFY: "verify",
};

// The constraints are defined in mustache files.
const mustacheFolder = Path.YmlConstraints;
const snippetsFolder = Path.YmlSnippets;
const solutionFolder = Path.Solution;

// example:  " key1: value, key2 " => { key1: value, key2: true }
function strToObj(str) {
  try {
    return JSON.parse(str);
  } catch {}

  if (!str) {
    return {};
  }
  let obj = {};
  const properties = str.split(",");
  properties.forEach(function (property) {
    if (property.includes(":")) {
      const tup = property.split(":");
      obj[tup[0].trim()] = tup[1].trim();
    } else {
      obj[property.trim()] = true;
    }
  });
  return obj;
}

// read all yml files and mustache files in folder as mustache variables
function generateVariablesFromSnippets(dir) {
  let result = {};
  utils.filterYmlFiles(dir).map((file) => {
    const yml = readFileSync(file, "utf8");
    result = { ...result, ...{ [path.basename(file, Ext.Yml)]: yml } };
  });
  utils.filterMustacheFiles(dir).map((file) => {
    const mustache = readFileSync(file, "utf8");
    result = {
      ...result,
      ...{
        [path.basename(file, Ext.Mustache)]: function () {
          return function (text) {
            const view = strToObj(text.trim());
            const result = utils.renderMustache(mustache, view).trimEnd();
            return Object.keys(view).length === 0 ? result + os.EOL : result;
          };
        },
      },
    };
  });
  return result;
}

function* solveMustache(mustachePaths) {
  for (const mustachePath of mustachePaths) {
    const template = readFileSync(mustachePath, "utf8");
    const variables = generateVariablesFromSnippets(snippetsFolder);
    const solution = utils.renderMustache(template, variables);
    yield { mustachePath, solution };
  }
}

function validateMustachePath(mustachePath) {
  // no input, return all mustache files
  if (!mustachePath) {
    return utils.filterMustacheFiles(mustacheFolder);
  }
  // input is a folder, return all mustache files in folder
  if (lstatSync(mustachePath).isDirectory()) {
    return utils.filterMustacheFiles(mustachePath);
  }
  if (!mustachePath.endsWith(Ext.Mustache)) {
    throw new Error("Invalid mustache file path");
  }
  if (!existsSync(mustachePath)) {
    throw new Error("Invalid path");
  }
  // return input mustache file
  return [mustachePath];
}

function validateAction(action) {
  if (!Object.values(Action).includes(action)) {
    throw new Error(`Invalid action. Must be either ${Object.values(Action)}`);
  }
  return action;
}

function parseInput() {
  return {
    action: validateAction(process.argv[2]),
    mustachePaths: validateMustachePath(process.argv[3]),
  };
}

function main({ action, mustachePaths }) {
  let SAT = Action.VERIFY === action;
  for (const { mustachePath, solution } of solveMustache(mustachePaths)) {
    const solutionPath = path.resolve(
      solutionFolder,
      path.dirname(path.relative(mustacheFolder, mustachePath)),
      path.basename(mustachePath, Ext.Mustache) + Ext.YmlTpl
    );
    switch (action) {
      case Action.APPLY:
        writeFileSync(solutionPath, solution);
        break;
      case Action.VERIFY:
        const expected = readFileSync(solutionPath, "utf8");
        const assertion = solution.replace(/\r\n/g, "\n") === expected.replace(/\r\n/g, "\n");
        console.assert(
          assertion,
          `${solutionPath} is not satisfied with the constraint ${mustachePath}`
        );
        SAT = SAT && assertion;
        break;
    }
  }

  if (SAT) {
    console.log("All constraints are satisfied");
  }
}

main(parseInput());
