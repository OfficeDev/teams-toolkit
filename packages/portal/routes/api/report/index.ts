import Mongo from '~/utils/mongodb.ts';
import { getToday, initTestCase } from '~/utils/tools.ts';
import { CaseSchema, reportNameEnum } from '~/utils/schema.ts';

export const GET = async (req: Request) => {
  const search = new URL(req.url).search;
  const date = new URLSearchParams(search).get('date');
  const on = new URLSearchParams(search).get('on');
  const mongo = new Mongo();
  await mongo.connect();
  if (
    (!date || date === 'today' || date === 'now') && (!on || on === 'schedule')
  ) {
    // search today's report
    console.log('search today\'s report');
    const reportList = [];

    // const result = await mongo.findMany('CLI e2e test', { 'git.date': '2022-08-31', 'github.on': 'schedule' })
    for (const reportId of ['01', '02', '03', '04', '05', '06']) {
      const result = await mongo.findMany(
        reportNameEnum[reportId as keyof typeof reportNameEnum].split(' ').join(
          '_',
        ),
        { 'basic.date': getToday() },
      );
      if (result.state === 'success') {
        reportList.push(
          initTestCase(
            reportId as keyof typeof reportNameEnum,
            result.data as CaseSchema[],
          ),
        );
      }
    }
    return new Response(
      JSON.stringify({
        errMsg: 'ok',
        data: reportList,
      }),
      {
        headers: {
          'content-type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        status: 200,
      },
    );
  } else if (date == 'history' && !on || on === 'schedule') {
    // search history report (default: 90 days)
    // get 3 month ago date
    const threeMonthAgo = new Date();
    threeMonthAgo.setMonth(threeMonthAgo.getMonth() - 2);
    threeMonthAgo.setDate(1);

    console.log('search history report');
    const result = await mongo.findMany('reports', {
      on: 'schedule',
      reportStartTime: { $gte: threeMonthAgo },
    });
    mongo.close();
    return new Response(
      JSON.stringify({
        errMsg: 'ok',
        ...result,
      }),
      {
        headers: {
          'content-type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        status: 200,
      },
    );
  } else {
    return new Response(
      JSON.stringify({
        errMsg: 'invilid params',
        state: 'fail',
      }),
      {
        headers: {
          'content-type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        status: 400,
      },
    );
  }
};
