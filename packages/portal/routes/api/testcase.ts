import Mongo from '~/utils/mongodb.ts';
import {
  computeTime,
  getToday,
  parseAuthor,
  updateRuntime,
  verifyToken,
} from '~/utils/tools.ts';
import { CaseSchema, reportNameEnum } from '~/utils/schema.ts';

export const POST = async (request: Request) => {
  const isAuth = verifyToken(request.headers);
  if (isAuth) {
    // verify and reconstruct data
    const data: CaseSchema = await request.json();
    const { git, basic, mochawesome, github, azure, azureTestResult } = data;

    if (!git || !basic) {
      return new Response(
        JSON.stringify({
          state: 'fail',
          error: 'invilid data',
        }),
        {
          headers: {
            'content-type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          status: 302,
        },
      );
    }

    // format basic
    if (!basic.reportId) {
      return new Response(
        JSON.stringify({
          state: 'fail',
          error: 'invilid data',
        }),
        {
          headers: {
            'content-type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          status: 302,
        },
      );
    }

    // format basic
    basic.uploadTime = new Date();
    if (mochawesome?.results) {
      basic.author = parseAuthor(
        mochawesome?.results[0]?.suites[0]?.tests[0]?.context || '',
      ) || git.author || 'unknown';
    } else {
      basic.author = git.author || 'unknown';
    }
    basic.reportName = reportNameEnum[basic.reportId];

    // format git
    const project = JSON.parse(
      await Deno.readTextFile('./test-web-server/config.json'),
    );
    git.organization = git.organization || project.ORGANIZATION;
    git.repository = git.repository || project.REPOSITORY;
    git.branch = git.branch || 'unknown';
    git.commit = git.commit || 'unknown';
    git.date = git.date || new Date();
    git.author = git.author || 'unknown';
    const testCase: CaseSchema = {
      basic,
      git,
      github,
      mochawesome,
      azure,
      azureTestResult,
    };
    // get today
    testCase.basic.date = getToday();

    // conect to db
    const mongo = new Mongo();
    await mongo.connect();

    // CI failed
    if (basic.state === 'fail' && github) {
      // is unique case by jobId and parentRunId
      const res = await mongo.findOne(basic.reportName.split(' ').join('_'), {
        'github.jobId': github.jobId,
        'github.runId': github.runId,
      });
      if (res.state === 'fail') {
        testCase.mochawesome = {
          'stats': {
            'suites': 0,
            'tests': 0,
            'passes': 0,
            'pending': 0,
            'failures': 1,
            'start': '',
            'end': '',
            'duration': 0,
            'testsRegistered': 0,
            'passPercent': 0,
            'other': 0,
          },
          'results': [
            {
              'uuid': '',
              'title': '',
              'fullFile': '',
              'file': '',
              'beforeHooks': [],
              'afterHooks': [],
              'tests': [],
              'suites': [
                {
                  'uuid': '',
                  'title': '',
                  'fullFile': '',
                  'file': basic.errMsg || '',
                  'tests': [
                    {
                      'title': '',
                      'fullTitle': '',
                      'duration': 0,
                      'state': 'pending',
                      'pass': false,
                      'fail': false,
                      'pending': false,
                      'context': null,
                      'code': '',
                      'uuid': '',
                      'parentUUID': '',
                    },
                  ],
                  'passes': [],
                  'failures': [''],
                  'pending': [],
                  'skipped': [],
                  'duration': 0,
                  'root': false,
                  'rootEmpty': false,
                  '_timeout': 1200000,
                },
              ],
              'passes': [],
              'failures': [],
              'pending': [],
              'skipped': [],
              'duration': 0,
              'root': true,
              'rootEmpty': true,
              '_timeout': 1200000,
            },
          ],
        };
        const res = await mongo.insertOne(
          basic.reportName.split(' ').join('_'),
          testCase,
        );
        mongo.close();
        return res;
      } else {
        mongo.close();
        return new Response(
          JSON.stringify({
            state: 'fail',
            error: 'case is exist',
          }),
          {
            headers: {
              'content-type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
            status: 302,
          },
        );
      }
    }

    if (
      basic.reportId === '01' || basic.reportId === '02' ||
      basic.reportId === '05'
    ) {
      if (mochawesome && github) {
        // update title
        testCase.basic.title = mochawesome.results[0].suites[0].file;
        // culculate duration
        if (mochawesome.stats && testCase.github) {
          testCase.github.duration = mochawesome?.stats?.duration;
        }

        // anlysis mochawesome data
        testCase.github = updateRuntime(testCase);

        if (github.jobId && github.runId) {
          // save data to mongodb

          // is unique case by jobId and parentRunId
          const res = await mongo.findOne(
            basic.reportName.split(' ').join('_'),
            { 'github.jobId': github.jobId, 'github.runId': github.runId },
          );

          if (res.state === 'fail') {
            // update or insert
            const res = await mongo.findOne(
              basic.reportName.split(' ').join('_'),
              { 'basic.title': basic.title, 'github.runId': github.runId },
            );
            if (res.state === 'fail') {
              const res = await mongo.insertOne(
                basic.reportName.split(' ').join('_'),
                testCase,
              );
              mongo.close();
              return res;
            } else {
              const res = await mongo.updateOne(
                basic.reportName.split(' ').join('_'),
                { 'basic.title': basic.title, 'github.runId': github.runId },
                testCase,
              );
              mongo.close();
              return res;
            }
          } else {
            // Case already exists
            mongo.close();
            return new Response(
              JSON.stringify({
                state: 'fail',
                error: 'Case already exists.',
              }),
              {
                headers: {
                  'content-type': 'application/json',
                  'Access-Control-Allow-Origin': '*',
                },
                status: 200,
              },
            );
          }
        } else {
          return new Response(
            JSON.stringify({
              state: 'fail',
              error: 'invilid data',
            }),
            {
              headers: {
                'content-type': 'application/json',
                'Access-Control-Allow-Origin': '*',
              },
              status: 302,
            },
          );
        }
      } else {
        return new Response(
          JSON.stringify({
            state: 'fail',
            error: 'invilid data',
          }),
          {
            headers: {
              'content-type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
            status: 302,
          },
        );
      }
    } else if (basic.reportId === '04') {
      if (testCase.azure && azureTestResult) {
        testCase.azure.duration = computeTime(azureTestResult.durationInMs);
        // is unique case by jobId and parentRunId
        const res = await mongo.findOne(basic.reportName.split(' ').join('_'), {
          'azureTestResult.testRun.id': azureTestResult.testRun.id,
        });
        if (res.state === 'fail') {
          const res = await mongo.insertOne(
            basic.reportName.split(' ').join('_'),
            testCase,
          );

          mongo.close();
          return res;
        } else {
          // Case already exists
          mongo.close();
          return new Response(
            JSON.stringify({
              state: 'fail',
              error: 'Case already exists.',
            }),
            {
              headers: {
                'content-type': 'application/json',
                'Access-Control-Allow-Origin': '*',
              },
              status: 200,
            },
          );
        }
      } else {
        return new Response(
          JSON.stringify({
            state: 'fail',
            error: 'invilid data',
          }),
          {
            headers: {
              'content-type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
            status: 302,
          },
        );
      }
    }

    return new Response(
      JSON.stringify({
        state: 'fail',
        error: 'unhandle branch',
      }),
      {
        headers: {
          'content-type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        status: 500,
      },
    );
  } else {
    // not authorized
    return new Response(JSON.stringify({ errMsg: 'unauthorization !!!' }), {
      headers: {
        'content-type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      status: 401,
    });
  }
};
