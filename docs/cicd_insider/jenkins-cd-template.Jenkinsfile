// This is just an example workflow for continuous deployment.
// The example workflow is expected to run on Ubuntu stable versions, for example, 20.04lts and later.
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
        // insider preview features are enabled by default

        // To specify the env name for multi-env feature.
        TEAMSFX_ENV_NAME = 'staging'
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
                sh 'cd tabs && npm ci && npm run build && cd -'
            }
        }

        // Run unit test.
        // Currently, no opinionated solution for unit test provided during scaffolding, so,
        // set up any unit test framework you prefer (for example, mocha or jest) and update the commands accordingly in below.
        stage('Run unit test') {
            steps {
                sh 'cd tabs && npm run test && cd -'
            }
        }

        // We suggest to do the `npx teamsfx provision` step manually or in a separate pipeline. The following steps are for your reference.
        // After provisioning, you should commit necessary files under .fx into the repository.
        // You should upload .fx/states/${TEAMSFX_ENV_NAME}.userdata into credentials (https://www.jenkins.io/doc/book/using/using-credentials/) in type of `Secret file` which can be refered by the stage with name 'Generate userdata'. 
        // stage('Provision hosting environment') {
        //     environment {
        //         TEAMSFX_BICEP_ENV_CHECKER_ENABLE = 'true'
        //     }
        //     steps {
        //         sh 'npx teamsfx provision --subscription ${AZURE_SUBSCRIPTION_ID} --env ${TEAMSFX_ENV_NAME}'
        //     }
        // }

        // stage('Commit provision configs if necessary') {
        //     steps {
        //         sh 'git add .fx'
        //         sh 'git commit -m "chore: commit provision configs"'
        //         sh 'git push'
        //     }
        // }

        // stage('Upload userdata as artifact') {
        //     steps {
        //         archiveArtifacts artifacts: '.fx/states/staging.userdata'
        //     }
        // }

        stage('Generate userdata') {
            environment {
                USERDATA_CONTENT = credentials('USERDATA_CONTENT')
            }
            steps {
                sh '[ ! -z "${USERDATA_CONTENT}" ] && cp ${USERDATA_CONTENT} .fx/states/${TEAMSFX_ENV_NAME}.userdata'
            }
        }

        stage('Deploy to hosting environment') {
            steps {
                sh 'npx teamsfx deploy --env ${TEAMSFX_ENV_NAME}'
            }
        }

        // This step is to pack the Teams App as zip file,
        // which can be used to be uploaded onto Teams Client for installation.
        stage('Package Teams App for publishing') {
            steps {
                sh 'npx teamsfx package --env ${TEAMSFX_ENV_NAME}'
            }
        }

        stage('Upload Teams App package as artifact') {
            steps {
                archiveArtifacts artifacts: 'build/appPackage/appPackage.staging.zip'
            }
        }

        stage('Publish Teams App') {
            steps {
                sh 'npx teamsfx publish --env ${TEAMSFX_ENV_NAME}'
            }
        }
    }
}
