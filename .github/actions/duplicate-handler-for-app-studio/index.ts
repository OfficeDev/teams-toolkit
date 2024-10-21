import { OctoKit, OctoKitIssue } from '../api/octokit';
import { Action } from '../common/Action';
import { context } from '@actions/github';
import { getRequiredInput, safeLog } from '../common/utils';
import { Octokit } from '@octokit/rest';
import { Issue } from '../api/api';
import { getTemplateFromPackageAndConvertToReg } from '../teamsfx-utils/utils';


const githubToken = getRequiredInput('token');

class DuplicateHandler extends Action {
	id = 'DuplicateHandlerForAppStudio';
	reply = getRequiredInput('reply');
	tags: string[];
	issue!: Issue;

	owner = context.repo.owner;
	repo = context.repo.repo;
	kit = new Octokit({
		auth: githubToken,
	});

	constructor() {
		super();
		const addingTags = getRequiredInput('adding-tags');
		this.tags = addingTags ? addingTags.split(',') : [];
	}

	async onOpened(issueHandler: OctoKitIssue) {
		this.issue = await issueHandler.getIssue();
		safeLog(`start DuplicateHandlerForAppStudio for Issue ${this.issue.number}`);
		const errorInfo = this.matchAppStudioIssueError();
		if (errorInfo) {
			safeLog(`Issue ${this.issue.number} is an app studio service issue`);
		} else {
			safeLog(`Issue ${this.issue.number} is not related to app studio service`);
			return;
		}
		const searchMessage = this.getSearchMessage(errorInfo);
		safeLog(`search message is ${searchMessage}`);
		const firstIssueNumber = await this.getFirstRelatedIssueNumber(searchMessage!);
		safeLog(`Issue ${firstIssueNumber} is the first related app studio service issue`);
		if (firstIssueNumber === this.issue.number || firstIssueNumber === 0) {
			safeLog(`Issue ${firstIssueNumber} itself is the first one. Just return`);
			return;
		}
		safeLog(`Issue ${firstIssueNumber} is the first one. Add a comment in this issue to refer`);
		const replyMessage = this.reply.replace('{{first}}', `#${firstIssueNumber}`);
		await issueHandler.postComment(replyMessage);

		safeLog(`Add tags`);
		await this.addTags(issueHandler);

		safeLog(`Executed duplicate progress for Issue ${firstIssueNumber}`);
	}

	async onTriggered(_: OctoKit) {
		const issueNumber = process.env.ISSUE_NUMBER;
		safeLog(`start manually trigger issue ${issueNumber}`);
		const issue = new OctoKitIssue(githubToken, context.repo, { number: parseInt(issueNumber || "0") });
		await this.onOpened(issue);
	}

	matchAppStudioIssueError(): ErrorInfo | undefined {
		const key = "error.appstudio.apiFailed.telemetry";
		const regStr = getTemplateFromPackageAndConvertToReg(key);
		if (!regStr) {
			safeLog(`There is template for ${key} in package.nls.json, ignore`);
			return undefined;
		}
		safeLog(`matching-reg is ${regStr}`);
		const reg = new RegExp(regStr, 'g');
		const res = reg.exec(this.issue.body);
		if (res) {
			return {
				statusCode: res[2],
				apiName: res[3],
				message: res[0],
			};
		}
		return undefined;
	}

	async addTags(issueHandler: OctoKitIssue) {
		for (const tag of this.tags) {
			await issueHandler.addLabel(tag);
		}
	}

	getSearchMessage(errorInfo: ErrorInfo): string {
		const indexOfstatusCode = errorInfo.message.indexOf(errorInfo.statusCode);
		const indexOfApiName = errorInfo.message.indexOf(errorInfo.apiName);
		return errorInfo.message.substring(indexOfstatusCode, indexOfApiName + errorInfo.apiName.length);
	}

	async getFirstRelatedIssueNumber(message: string): Promise<number> {
		const res = await this.kit.search.issuesAndPullRequests({
			q: `"${message}" in:body+is:issue+is:open+repo:${this.owner}/${this.repo}`,
			order: 'asc',
			sort: 'created',
			per_page: 1,
		});
		if (res.data.total_count > 0) {
			return res.data.items[0].number;
		} else {
			return 0;
		}
	}
}

interface ErrorInfo {
	statusCode: string;
	apiName: string;
	message: string;
}

new DuplicateHandler().run(); // eslint-disable-line
