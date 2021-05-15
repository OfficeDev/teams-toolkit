# TeamsFx CLI Development Guide

## Build and Run Locally

1. `git clone https://github.com/OfficeDev/TeamsFx.git`
2. `cd TeamsFx`
3. `npm install`

If you meet the error showing that some package cannot install, you can delete this package's `package-lock.json` file and try `npm install` under `TeamsFx` folder again.

## How to Generate Parameter Files (for Repo Contributors)

### Setup repo
You can follow [Build and Run Locally](#build-and-run-locally) of this readme.

### Run
```bash
# get new/resource-add/capability-add/provision stage parameters
node .\lib\generators\ new resource-add capability-add provision
```