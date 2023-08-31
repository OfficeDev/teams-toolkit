const { readFileSync, lstatSync, existsSync } = require("node:fs");
const path = require("path");
const utils = require("./utils");
const { Ext, Path, RegExp } = require("./constants");
const yaml = require("js-yaml");
const os = require("os");
const { exit } = require("node:process");

// The solver is called by the following command:
// > node yamlSolver.js <command> <constraintFilePath>

// The solver support three commands
// 1. apply the constraints to solution
// 2. verify the constraints are satisfied.
// 3. init the constraint with the solution.
const Command = {
  APPLY: "apply",
  VERIFY: "verify",
  INIT: "init",
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

// example: { key1: value, key2: true } => "key1: value, key2"
function objToStr(obj) {
  let str = "";
  for (const [key, value] of Object.entries(obj)) {
    if (!value) {
      continue;
    }
    if (value === true) {
      str += `${key}, `;
    } else {
      str += `${key}: ${value}, `;
    }
  }
  return str.slice(0, -2);
}

// return the value of the key in the object
function findKey(obj, key) {
  if (obj.hasOwnProperty(key)) {
    return obj[key];
  }
  for (let k in obj) {
    if (typeof obj[k] === "object" && obj[k]) {
      const result = findKey(obj[k], key);
      if (result) {
        return result;
      }
    }
  }
}

// remove '/' and uppercase the next character
function normalizeActionName(name) {
  return name.replace(/\/(.)/g, (_, c) => c.toUpperCase());
}

function isMustacheSection(placeholder) {
  return placeholder.includes("#");
}

function addLifecycle(header, actions) {
  if (!actions) {
    return "";
  }
  let content = header;

  actions.map((action) => {
    const actionName = normalizeActionName(action.uses);
    const actionPath = path.resolve(snippetsFolder, actionName + Ext.Mustache);
    const actionTemplate = readFileSync(actionPath, "utf8");

    let variables = {};
    actionTemplate.match(RegExp.AllPlaceholders)?.map((match) => {
      const variableName = match.replace(RegExp.AllMustacheDelimiters, "");
      if (isMustacheSection(match) && typeof variables[variableName] !== "string") {
        variables[variableName] = JSON.stringify(action).includes(variableName);
        return;
      }
      variables[variableName] = findKey(action, variableName);
    });

    content += `{{#${actionName}}} ${objToStr(variables)} {{/${actionName}}}` + os.EOL;
  });
  return content;
}

function generateConstraintFromSolution(ymlString, options) {
  const yml = yaml.load(ymlString.replace(/{{appName}}/g, "appName"));
  const isLocal = options.isLocal;

  const header = `{{#header}} version: 1.0.0 {{/header}}` + os.EOL;
  const environmentPath = "environmentFolderPath: ./env" + os.EOL;
  const lifecycleHeader = (lifecycle, isLocal) =>
    isLocal
      ? `${lifecycle}:${os.EOL}`
      : `# Triggered when 'teamsfx ${lifecycle}' is executed${os.EOL}${lifecycle}:${os.EOL}`;

  const provisionLifecycle = addLifecycle(lifecycleHeader("provision", isLocal), yml.provision);
  const deployLifecycle = addLifecycle(lifecycleHeader("deploy", isLocal), yml.deploy);
  const publishLifecycle = addLifecycle(lifecycleHeader("publish", isLocal), yml.publish);

  const constraint = (
    isLocal
      ? [header, provisionLifecycle, deployLifecycle]
      : [header, environmentPath, provisionLifecycle, deployLifecycle, publishLifecycle]
  ).join(os.EOL);
  return constraint;
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

function solveMustache(mustachePaths) {
  return mustachePaths.map((mustachePath) => {
    const template = readFileSync(mustachePath, "utf8");
    const variables = generateVariablesFromSnippets(snippetsFolder);
    const solution = utils.renderMustache(template, variables);
    const solutionPath = path.resolve(
      solutionFolder,
      path.dirname(path.relative(mustacheFolder, mustachePath)),
      path.basename(mustachePath, Ext.Mustache)
    );
    return { mustachePath, solution, solutionPath };
  });
}

class YamlSolver {
  constructor({ command, constraintsPath, solutionsPath }) {
    this.command = command;
    this.mustachePaths = constraintsPath;
    this.ymlPaths = solutionsPath;
  }

  solve() {
    switch (this.command) {
      case Command.APPLY:
        this.apply();
        break;
      case Command.VERIFY:
        this.verify();
        break;
      case Command.INIT:
        this.init();
        break;
    }
  }

  apply() {
    for (const { solution, solutionPath } of solveMustache(this.mustachePaths)) {
      utils.writeFileSafe(solutionPath, solution);
    }
  }

  verify() {
    let SAT = true;
    for (const { mustachePath, solution, solutionPath } of solveMustache(this.mustachePaths)) {
      const expected = readFileSync(solutionPath, "utf8");
      const assertion = solution.replace(/\r\n/g, "\n") === expected.replace(/\r\n/g, "\n");
      console.assert(
        assertion,
        `${solutionPath} is not satisfied with the constraint ${mustachePath}`
      );
      SAT = SAT && assertion;
    }

    if (SAT) {
      console.log("All constraints are satisfied");
    } else {
      console.log(
        // eslint-disable-next-line no-secrets/no-secrets
        `To resolve the problem, you have two options to consider:
        1. Execute "npm run apply" in the ./templates folder to apply the constraints to the solution.
        2. Refer to the [contribution guides](https://github.com/OfficeDev/TeamsFx/blob/dev/templates/CONTRIBUTING.md#what-is-template-constraints) to update your constraints.`
      );
      exit(1);
    }
  }

  init() {
    this.ymlPaths.map((file) => {
      const mustachePath = path.resolve(
        mustacheFolder,
        path.dirname(path.relative(solutionFolder, file)),
        path.basename(file) + Ext.Mustache
      );
      if (existsSync(mustachePath)) {
        return;
      }
      const constraint = generateConstraintFromSolution(readFileSync(file, "utf8"), {
        isLocal: path.basename(file).includes("local"),
      });
      utils.writeFileSafe(mustachePath, constraint);
    });
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

function validateCommand(command) {
  if (!Object.values(Command).includes(command)) {
    throw new Error(`Invalid command. Must be either ${Object.values(command)}`);
  }
  return command;
}

function parseInput() {
  const command = validateCommand(process.argv[2]);
  if (command === Command.INIT) {
    return {
      command,
      solutionsPath: utils.filterYmlFiles(path.resolve(process.argv[3])),
    };
  }
  return {
    command,
    constraintsPath: validateMustachePath(process.argv[3]),
  };
}

new YamlSolver(parseInput()).solve();
