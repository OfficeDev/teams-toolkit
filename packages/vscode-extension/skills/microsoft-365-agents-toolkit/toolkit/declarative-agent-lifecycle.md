# Declarative Agent Lifecycle with WIQD

Use WIQD for Declarative Agent (DA) manifest lifecycle operations. This reference is directly executable guidance; do not fall back to ATK for DA lifecycle commands.

## Detect a Declarative Agent

Treat the request or project as a DA when any of these conditions is true:

- The user explicitly says "Declarative Agent" or "DA" in a Declarative Agent context.
- `appPackage/declarativeAgent.json` exists.
- `appPackage/manifest.json` contains `copilotAgents.declarativeAgents`.

The presence of `m365agents.yml` does not make a project non-DA. Check the DA markers before selecting a lifecycle CLI.

## Read-Only Reference Requests

Answer questions about DA schemas, manifest fields, capabilities, examples, or project structure from the local references without requiring WIQD installation or authentication. Require WIQD only when executing a DA lifecycle operation.

## WIQD Setup

Before the first DA lifecycle command, run:

```bash
wiqd --version
```

If WIQD is unavailable, tell the user to install or enable it and stop the DA lifecycle workflow. Do not use ATK as a fallback.

PowerShell installation:

```powershell
iex "& { $(irm 'https://aka.ms/wiqd/install.ps1') }"
```

Use these diagnostics when needed:

```bash
wiqd auth status
wiqd auth login --interactive
wiqd doctor
```

Do not require login until the requested operation needs Microsoft 365 access.

## Lifecycle Commands

Use this mapping for DA lifecycle intent. The ATK commands in the left column remain valid for non-DA projects; never execute them against a DA manifest.

| DA intent or former ATK command | WIQD command                                                                                         |
| ------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `atk new`                       | `wiqd agent create --name <name> --output <parent>`                                                  |
| `atk validate`                  | `wiqd agent validate --path <project> --env <env>`                                                   |
| `atk package`                   | `wiqd agent package --path <project> --env <env>`                                                    |
| `atk provision`                 | `wiqd agent provision --path <project> --env <env>`                                                  |
| `atk share`                     | `wiqd agent share --path <project> --env <env> --scope users --email <comma-separated-emails>`       |
| Remove sharing                  | `wiqd agent share remove --path <project> --env <env> --users <comma-separated-emails>`               |
| `atk publish`                   | `wiqd agent publish --path <project> --env <env>`                                                    |
| `atk uninstall`                 | `wiqd agent delete --path <project> --env <env>`                                                     |
| `atk auth list`                 | `wiqd auth status`                                                                                   |
| `atk auth login m365`           | `wiqd auth login --interactive`                                                                      |
| `atk doctor`                    | `wiqd doctor`                                                                                        |

Do not execute `wiqd agent publish` unless the user explicitly asks to publish and confirms the target.

For a pure DA with no backend compute, use this sequence:

```text
validate -> package -> provision -> share or publish
```

Do not run `atk deploy` for a pure DA.

## OpenAPI Actions

Inspect the OpenAPI document and ask the user to resolve any missing operation selection. Pass operations as one comma-separated value:

```bash
wiqd agent add action \
  --folder <project-directory> \
  --openapi-spec <path-or-url> \
  --operations "GET /resource,POST /resource"
```

Do not add ATK-only flags such as `--api-plugin-type`, `--openapi-spec-type`, `--openapi-spec-location`, `--api-operation`, or `-i false` to WIQD commands.

## MCP Actions

No authentication:

```bash
wiqd agent add action --folder <project> --mcp-server-url <url> --mcp-auth-type none
```

Dynamic OAuth:

```bash
wiqd agent add action --folder <project> --mcp-server-url <url> --mcp-auth-type oauth-dynamic
```

Static OAuth:

```bash
wiqd agent add action \
  --folder <project> \
  --mcp-server-url <url> \
  --mcp-auth-type oauth \
  --mcp-client-id <id> \
  --mcp-client-secret <secret> \
  --mcp-scopes <space-separated-scopes>
```

Entra SSO:

```bash
wiqd agent add action \
  --folder <project> \
  --mcp-server-url <url> \
  --mcp-auth-type entra-sso \
  --mcp-client-id <id>
```

For static OAuth, require a real client ID and client secret; scopes are optional and must come from the user or provider documentation. For Entra SSO, require a real client ID. Never invent client IDs, client secrets, or scopes.

## Hybrid DA and Backend Projects

Keep the two lifecycles separate when a DA includes an API or MCP backend:

| Surface                                                                                          | Tool                            |
| ------------------------------------------------------------------------------------------------ | ------------------------------- |
| DA manifest, actions, validation, packaging, provisioning, sharing, publishing, deletion         | WIQD                            |
| Backend source code, Azure resources, and compute deployment                                     | ATK or Azure deployment tooling |
| Teams bot, Custom Engine Agent, tab, message extension, Agents Playground, Teams runtime testing | ATK                             |

Running ATK or Azure deployment tooling for backend compute does not transfer DA manifest ownership back to ATK. Do not run ATK lifecycle commands against the DA manifest.
