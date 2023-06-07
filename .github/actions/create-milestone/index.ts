import { OctoKit } from '../api/octokit';
import { Action } from '../common/Action';
import { context } from '@actions/github';
import { getRequiredInput, safeLog } from '../common/utils';
import { Octokit as Kit } from '@octokit/rest';

const token = getRequiredInput('token');
const milestonePrefix = getRequiredInput('milestone-prefix');
const milestoneDays = +getRequiredInput('milestone-days');
const advancedDays = +getRequiredInput('advanced-days');
const owner = context.repo.owner;
const repo = context.repo.repo;
const kit = new Kit({
	auth: token,
});

class CreateMilestone extends Action {
	id = 'CreateMilestone';

	async onTriggered(_: OctoKit) {
		safeLog(`start check and create milestone`);
		const latest = await getLastest(milestonePrefix);
		safeLog(`latest milestone is ${latest.year}-${latest.month}.${latest.order}`);
		const next = await buildNext(latest, advancedDays, milestoneDays);
		if (!next) {
			return;
		}
		safeLog(`create new milestone ${next.year}-${next.month}.${next.order}`);
		await createMilestone(next, milestonePrefix);
	}
}

new CreateMilestone().run() // eslint-disable-line

type MilestoneInfo = {
	year: number;
	month: number;
	order: number;
	due_on?: Date;
};

async function getLastest(prefix: string): Promise<MilestoneInfo> {
	let resp = await kit.request('GET /repos/{owner}/{repo}/milestones', {
		owner: owner,
		repo: repo,
		direction: 'desc',
		state: 'all',
		per_page: 20,
	});
	const milestones = resp.data.filter(
		(item: { title: string }) =>
			item.title.includes(prefix) && item.title.includes('-') && item.title.includes('.'),
	);
	if (milestones.length === 0) {
		throw new Error('no validate milestone');
	}
	let latestIndex = 0;
	let latestInfo = parseTitle(milestones[0].title);
	for (let i = 1; i < milestones.length; i++) {
		const element = milestones[i];
		const currentInfo = parseTitle(element.title);
		if (isLater(currentInfo, latestInfo)) {
			latestInfo = currentInfo;
			latestIndex = i;
		}
	}

	if (!milestones[latestIndex].due_on) {
		throw new Error(`milestone ${milestones[latestIndex].title} has no due date`);
	}
	latestInfo.due_on = new Date(milestones[latestIndex].due_on!);
	return latestInfo;
}

function parseTitle(t: string): MilestoneInfo {
	t = t.replace(/CY/g, '');
	let arr = t.split(/[-.]+/);
	return {
		year: Number(arr[0]),
		month: Number(arr[1]),
		order: Number(arr[2]),
	};
}

function buildNext(
	now: MilestoneInfo,
	advancedDays: number,
	milestoneDays: number,
): MilestoneInfo | undefined {
	const current = new Date();

	const createDate = addDays(now.due_on!, -advancedDays);

	// if current is earlier than create date, just return undefined.
	if (current < createDate) {
		safeLog(
			`the start date to create milestone is ${createDate.toISOString()}, now is ${current.toISOString()}. Just skip`,
		);
		return undefined;
	}

	const nextDueDay = addDays(now.due_on!, milestoneDays);

	// if current is later than next due day, there should be some error happened.
	if (current > nextDueDay) {
		throw new Error(
			`new milestone created based on ${now.year}-${now.month}.${now.order} will have expired due date`,
		);
	}

	const startDate = addDays(now.due_on!, 1);
	let next: MilestoneInfo = {
		year: startDate.getFullYear() - 2000,
		month: startDate.getMonth() + 1,
		order: 1,
	};
	if (now.month == next.month) {
		next.order = now.order + 1;
	}
	next.due_on = nextDueDay;
	return next;
}

async function createMilestone(info: MilestoneInfo, prefix: string): Promise<void> {
	const title = `${prefix}${info.year}-${info.month}.${info.order}`;
	await kit.request('POST /repos/{owner}/{repo}/milestones', {
		owner: owner,
		repo: repo,
		title: title,
		due_on: info.due_on!.toISOString(),
		description: 'created by action',
	});
}

function addDays(date: Date, days: number): Date {
	var result = new Date(date);
	result.setDate(result.getDate() + days);
	return result;
}

function isLater(a: MilestoneInfo, b: MilestoneInfo): boolean {
	if (a.year < b.year) {
		return false;
	} else if (a.year > b.year) {
		return true;
	}

	if (a.month < b.month) {
		return false;
	} else if (a.month > b.month) {
		return true;
	}

	if (a.order < b.order) {
		return false;
	} else if (a.order > b.order) {
		return true;
	}

	return false;
}
