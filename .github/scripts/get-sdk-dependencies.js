const axios = require("axios");
const glob = require("glob");
const fs = require("fs");
const path = require("path");

const repoRoot = __dirname + "/../..";

async function getSDKDependencies() {
  var dependenciesMap = new Map();
  const SDKPkgJsonPath = `${repoRoot}/packages/sdk*/package.json`;
  const packageJsonFiles = await glob.glob(SDKPkgJsonPath, {
    ignore: "node_modules/**",
  });

  packageJsonFiles.forEach((packageJsonFile) => {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonFile, "utf8"));
    let dependencies = packageJson["dependencies"];
    let SDKPkg =
      path.basename(path.dirname(packageJsonFile)) === "sdk"
        ? "TeamsFx JS/TS SDK"
        : "TeamsFx React SDK";
    Object.assign(dependencies, packageJson["peerDependencies"]);
    for (dependency in dependencies) {
      if (dependenciesMap.has(dependency)) {
        dependenciesMap.get(dependency).push({
          SDKPkg,
          version: dependencies[dependency],
        });
      } else {
        dependenciesMap.set(dependency, [
          { SDKPkg, version: dependencies[dependency] },
        ]);
      }
    }
  });
  return dependenciesMap;
}

async function getDotnetSDKDependencies() {
  var dependenciesMap = new Map();
  const csprojContent = fs.readFileSync(
    `${repoRoot}/packages/dotnet-sdk/src/TeamsFx/Microsoft.TeamsFx.csproj`,
    "utf8"
  );
  const csDependencies = csprojContent
    .split("\n")
    .filter((line) => line.includes("<PackageReference"))
    .map((line) => {
      const name = line.match(/Include="(.*)" Version/)[1];
      const version = line.match(/Version="(.*)"/)[1];
      return { name, version };
    });

  for (const csDependency of csDependencies) {
    if (dependenciesMap.has(csDependency.name)) {
      dependenciesMap.get(csDependency.name).push({
        SDKPkg: "TeamsFx .NET SDK",
        version: csDependency.version,
      });
    } else {
      dependenciesMap.set(csDependency.name, [
        { SDKPkg: "TeamsFx .NET SDK", version: csDependency.version },
      ]);
    }
  }

  return dependenciesMap;
}

function generateAdaptiveCardColumnSets(arr) {
  if (arr.length === 0) {
    return [];
  }
  let columnSets = [
    {
      type: "ColumnSet",
      columns: [
        {
          type: "Column",
          width: 30,
          items: [
            {
              type: "TextBlock",
              text: "Package",
              wrap: true,
              weight: "Bolder",
            },
          ],
          verticalContentAlignment: "Center",
        },
        {
          type: "Column",
          width: 50,
          items: [
            {
              type: "TextBlock",
              text: "SDK",
              wrap: true,
              weight: "Bolder",
            },
          ],
          verticalContentAlignment: "Center",
        },
        {
          type: "Column",
          width: 20,
          items: [
            {
              type: "TextBlock",
              text: "Version",
              wrap: true,
              weight: "Bolder",
            },
          ],
          verticalContentAlignment: "Center",
        },
      ],
      separator: true,
      horizontalAlignment: "Center",
    },
  ];
  let factSets = [];
  for (items of arr) {
    factSets.push({
      title: `[${items.name}](${
        items.dependencies[0].SDKPkg === "TeamsFx .NET SDK"
          ? `https://www.nuget.org/packages/${items.name})`
          : `https://www.npmjs.com/package/${items.name})`
      }`,
      value: `LTS-${items.version}`,
    });
    columnSets.push({
      type: "ColumnSet",
      columns: [
        {
          type: "Column",
          width: 30,
          items: [
            {
              type: "TextBlock",
              text:
                `[${items.name}](${
                  items.dependencies[0].SDKPkg === "TeamsFx .NET SDK"
                    ? `https://www.nuget.org/packages/${items.name})`
                    : `https://www.npmjs.com/package/${items.name})`
                }` +
                "\n\r" +
                `LTS-${items.version}`,
              wrap: true,
            },
          ],
        },
        {
          type: "Column",
          width: 70,
          items: items.dependencies.map((dependency) => {
            return {
              type: "ColumnSet",
              columns: [
                {
                  type: "Column",
                  width: 50,
                  items: [
                    {
                      type: "TextBlock",
                      text: dependency.SDKPkg,
                      wrap: true,
                    },
                  ],
                },
                {
                  type: "Column",
                  width: 20,
                  items: [
                    {
                      type: "TextBlock",
                      text:
                        dependency.version[0] === ">"
                          ? "\\" + dependency.version
                          : dependency.version,
                      wrap: true,
                    },
                  ],
                },
              ],
            };
          }),
          verticalContentAlignment: "Center",
          horizontalAlignment: "Center",
        },
      ],
      separator: true,
    });
  }

  const sdkDependencySectionBody = [
    {
      type: "TextBlock",
      text: 'LTS updates available for some packages. Click "Show Details" for more information:',
      weight: "Bolder",
      wrap: true,
    },
    {
      type: "FactSet",
      facts: factSets,
    },
    {
      type: "Container",
      items: columnSets,
      id: "list",
      separator: true,
      isVisible: false,
    },
    {
      type: "ColumnSet",
      columns: [
        {
          type: "Column",
          selectAction: {
            type: "Action.ToggleVisibility",
            targetElements: ["list", "show", "hide", "down", "up"],
          },
          verticalContentAlignment: "Center",
          items: [
            {
              type: "TextBlock",
              id: "show",
              text: "Show Details",
              isSubtle: true,
              weight: "Bolder",
            },
            {
              type: "TextBlock",
              id: "hide",
              text: "Hide Details",
              isVisible: false,
              isSubtle: true,
              weight: "Bolder",
            },
          ],
          width: "auto",
          style: "emphasis",
        },
        {
          type: "Column",
          selectAction: {
            type: "Action.ToggleVisibility",
            targetElements: ["list", "show", "hide", "down", "up"],
          },
          verticalContentAlignment: "Center",
          items: [
            {
              type: "Image",
              id: "down",
              url: "https://adaptivecards.io/content/down.png",
              width: "20px",
            },
            {
              type: "Image",
              id: "up",
              url: "https://adaptivecards.io/content/up.png",
              width: "20px",
              isVisible: false,
            },
          ],
          width: "auto",
          spacing: "None",
          style: "emphasis",
        },
      ],
    },
  ];

  return sdkDependencySectionBody;
}

async function main() {
  const dependenciesMap = await getSDKDependencies();
  let arr = [];
  for (const entry of dependenciesMap.entries()) {
    await axios
      .get(`https://registry.npmjs.org/${entry[0]}`)
      .then((response) => {
        const ltsVersion = response.data["dist-tags"].latest;
        const ltsVersionTime = response.data.time[ltsVersion];
        const timeDiff = (new Date() - new Date(ltsVersionTime)) / 1000;
        if (timeDiff <= 86400) {
          arr.push({
            name: entry[0],
            version: ltsVersion,
            dependencies: entry[1],
          });
        }
      });
  }

  const csharpDependencyMap = await getDotnetSDKDependencies();
  for (const entry of csharpDependencyMap.entries()) {
    await axios
      .get(
        `https://api.nuget.org/v3/registration5-gz-semver2/${entry[0].toLowerCase()}/index.json`
      )
      .then((response) => {
        const ltsVersion = response.data["items"].at(-1).upper;
        const ltsVersionTime = response.data.commitTimeStamp;
        const timeDiff = (new Date() - new Date(ltsVersionTime)) / 1000;
        if (timeDiff <= 86400) {
          arr.push({
            name: entry[0],
            version: ltsVersion,
            dependencies: entry[1],
          });
        }
      });
  }

  const table = generateAdaptiveCardColumnSets(arr);
  const tableString = JSON.stringify(table);
  return JSON.stringify(tableString);
}

main().then((result) => {
  console.log(result);
});
