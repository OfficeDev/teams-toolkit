import { expect } from "chai";
import fs from "fs-extra";
import path from "path";
import { it } from "@microsoft/extra-shot-mocha";
import { getTestFolder, getUniqueAppName } from "../commonUtils";
import { Executor } from "../../utils/executor";
import { Cleaner } from "../../commonlib/cleaner";
import { TemplateProjectFolder } from "../../utils/constants";
export default function sampleCaseFactory(sampleName: TemplateProjectFolder) {
    let samplePath = '';
    return {
        sampleName,
        samplePath,
        test: function () {
            describe("teamsfx new template", function () {
                const testFolder = getTestFolder();
                const appName = getUniqueAppName();
                const projectPath = path.resolve(testFolder, appName);
                this.samplePath = projectPath;
                it(
                    async function () {
                        await Executor.openTemplateProject(
                            appName,
                            testFolder,
                            sampleName
                        );
                        expect(fs.pathExistsSync(projectPath)).to.be.true;
                        expect(fs.pathExistsSync(path.resolve(projectPath, "infra"))).to.be.true;

                        // Provision
                        {
                            const { success } = await Executor.provision(projectPath);
                            expect(success).to.be.true;
                        }

                        // deploy
                        {
                            const { success } = await Executor.deploy(projectPath);
                            expect(success).to.be.true;
                        }

                        // validate
                        {
                            const { success } = await Executor.validate(projectPath);
                            expect(success).to.be.true;
                        }

                        // package
                        {
                            const { success } = await Executor.package(projectPath);
                            expect(success).to.be.true;
                        }
                    }
                );
                after(async () => {
                    await Cleaner.clean(projectPath);
                });
            });
        }
    }
}