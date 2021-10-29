// This is just an example workflow for continuous deployment.
// You should customize it to meet your own requirements.
// The file may be renamed to Jenkinsfile, and put into main branch.
pipeline {
    // To customize the agent field, please refer to https://www.jenkins.io/doc/book/pipeline/syntax/#agent.
    agent any

    // To customize triggers, please refer to https://www.jenkins.io/doc/book/pipeline/syntax/#triggers.
    triggers { pollSCM('H */4 * * 1-5') }

    // To learn more about environment, please refer to https://www.jenkins.io/doc/book/pipeline/syntax/#environment.
    environment {
        AZURE_ACCOUNT_NAME = credentials('AZURE_ACCOUNT_NAME')
        AZURE_ACCOUNT_PASSWORD = credentials('AZURE_ACCOUNT_PASSWORD')
        M365_ACCOUNT_NAME = credentials('M365_ACCOUNT_NAME')
        M365_ACCOUNT_PASSWORD = credentials('M365_ACCOUNT_PASSWORD')
        AZURE_SUBSCRIPTION_ID = credentials('AZURE_SUBSCRIPTION_ID')
        AZURE_TENANT_ID = credentials('AZURE_TENANT_ID')
        // To enable @microsoft/teamsfx-cli running in CI mode, turn on CI_ENABLED like below.
        // In CI mode, @microsoft/teamsfx-cli is friendly for CI/CD. 
        CI_ENABLED = 'true'
    }

    stages {
        // Setup environment.
        stage('Setup environment') {
            steps {
                sh 'npm install'
                // Check the version of teamsfx.
                sh 'npx teamsfx -v'
            }
        }

        // Build the project.
        // The way to build the current project depends on how you scaffold it.
        // Different folder structures require different commands set.
        // 'npm ci' is used here to install dependencies and it depends on package-lock.json.
        // If you prefer to use 'npm ci', please make sure to commit package-lock.json first, or just change it to 'npm install'.
        stage('Build the project') {
            steps {
                sh 'cd tabs && npm ci && npm run build'
            }
        }

        // Run unit test.
        // Currently, no opinionated solution for unit test provided during scaffolding, so,
        // set up any unit test framework you prefer (for example, mocha or jest) and update the commands accordingly in below.
        stage('Run unit test') {
            steps {
                sh 'cd tabs && npm run test'
            }
        }

        // We suggest to do the `npx teamsfx provision` step manually or in a separate pipeline. The following steps are for your reference.
        // After provisioning, you should commit .fx/env.default.json into the repository.
        // You should upload .fx/default.userdata into credentials (https://www.jenkins.io/doc/book/using/using-credentials/) in type of `Secret file` which can be refered by the stage with name 'Generate default.userdata'. 
        // stage('Provision hosting environment') {
        //     steps {
        //         sh 'npx teamsfx provision --subscription ${AZURE_SUBSCRIPTION_ID}'
        //     }
        // }

        // stage('Commit provision configs if necessary') {
        //     steps {
        //         sh 'git add .fx/env.default.json'
        //         sh 'git commit -m "chore: commit provision configs"'
        //         sh 'git push'
        //     }
        // }

        // stage('Upload default.userdata as artifact') {
        //     steps {
        //         archiveArtifacts artifacts: '.fx/default.userdata'
        //     }
        // }

        stage('Generate default.userdata') {
            environment {
                USERDATA_CONTENT = credentials('USERDATA_CONTENT')
            }
            steps {
                sh '[ ! -z "${USERDATA_CONTENT}" ] && cp ${USERDATA_CONTENT} .fx/default.userdata'
            }
        }

        stage('Deploy to hosting environment') {
            steps {
                sh 'npx teamsfx deploy'
            }
        }

        // This step is to pack the Teams App as zip file,
        // which can be used to be uploaded onto Teams Client for installation.
        stage('Package Teams App for publishing') {
            steps {
                sh 'npx teamsfx package'
            }
        }

        stage('Upload Teams App package as artifact') {
            steps {
                archiveArtifacts artifacts: 'appPackage/appPackage.zip'
            }
        }

        stage('Publish Teams App') {
            steps {
                sh 'npx teamsfx publish'
            }
        }
    }
}