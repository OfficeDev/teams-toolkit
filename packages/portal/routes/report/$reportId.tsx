import { Link, useData, useRouter } from 'aleph/react';
import { changeStatusIcon, computeTime } from '~/utils/tools.ts';
import { useEffect, useState } from 'react';
import {
  CaseSchema,
  ReportSchema,
  TestCaseData,
  TestCaseSchema,
  testStatus,
} from '~/utils/schema.ts';

export const data = {
  get(_req: Request, ctx: Context) {
    const data = localStorage.getItem(ctx.params.reportId);
    if (data) {
      const jsonData: ReportSchema = JSON.parse(data);
      if (jsonData.reportResultStatus !== testStatus.out_of_data) {
        return {
          data: jsonData,
          errMsg: 'ok',
        };
      } else {
        return { errMsg: 'out_of_data' };
      }
    } else {
      location.href = '/';
    }
  },
};
//     statusIcon = 'check_circle'
//     statusIcon = 'report_problem'
//     statusIcon = 'highlight_off'
export default function report() {
  const reportTitle = 'Incident Report';
  const { data } = useData<{ errMsg: string; data: ReportSchema }>();
  const [reportCases, changeCases] = useState<CaseSchema[]>([]);
  const [reportId, changeId] = useState(data.data.reportId);
  useEffect(() => {
    if (data.errMsg === 'out_of_data') {
      window.location.href = '/';
    } else {
      changeCases(changeStatusIcon(data.data.reportCases));
    }
  }, []);

  const getContext = (id: string) => {
    if (id === '01') {
      return (
        <div className='w-9/10 max-w-350 mx-auto cursor-default'>
          <h1 className='text-3xl md-pb-8 py-4'>{reportTitle}</h1>
          <h2 className='mb-5 text-lg text-gray-500'>
            {new Date(Date.now()).toDateString()}
          </h2>
          <div className='border-gray-200 border-1.5   bg-white shadow-md shadow-gray-200 '>
            <div className=''>
              {data.data.testCaseList.map((item) => {
                return (
                  <div>
                    <div
                      onClick={() => {
                        window.location.href =
                          `https://github.com/OfficeDev/TeamsFx/actions/runs/${item.runId}`;
                      }}
                      className='pl-5 flex justify-left items-center  text-gray-600 text-lg bg-blue-100 h-10 sticky top-0 hover:cursor-pointer'
                    >
                      run id: {item.runId}
                    </div>
                    <table className='table-auto w-full border-collapse border-1 border-gray-300 '>
                      <thead className='text-center  text-gray-600 text-sm'>
                        <tr className='h-10 sticky top-10 bg-white'>
                          <th>No.</th>
                          <th>
                            status
                          </th>
                          <th>report name</th>
                          <th>author</th>
                          <th>duration</th>
                          <th>target type</th>
                          <th>core version</th>
                          <th>method({'>'} 20ms)</th>
                          <th>OS</th>
                          <th>node version</th>
                          <th>on</th>
                        </tr>
                      </thead>
                      <tbody className='text-center border-gray-300 text-sm'>
                        {/* testcases */}
                        {item.testCase.map((test, index1) => {
                          return (
                            <tr
                              className={`h-10   hover:bg-gray-200 border-0.5 border-gray-200 ${
                                index1 % 2 === 0 ? 'bg-gray-100' : ''
                              }`}
                              key={test.jobId}
                            >
                              <td className='px-3'>{index1 + 1}</td>
                              <td>
                                <span
                                  className='material-icons'
                                  style={{ 'color': test.statusIconColor }}
                                >
                                  {test.statusIcon}
                                </span>
                              </td>
                              <td>
                                <Link
                                  target='_blank'
                                  className='hover:link cursor-pointer px-3'
                                  to={test.caseURL || '/'}
                                >
                                  {test.title}
                                </Link>
                              </td>
                              <td className='hover:link cursor-pointer px-3'>
                                <a
                                  href={test.author?.includes('@microsoft.com')
                                    ? `mailto:${test.author}`
                                    : `javascript:void()`}
                                >
                                  {test.author}
                                </a>
                              </td>
                              <td className='px-3 whitespace-nowrap'>
                                {computeTime(test.duration)}
                              </td>
                              <td className='px-3'>{test.targetType}</td>
                              <td className='px-3'>{test.coreVersion}</td>
                              <td
                                className={`${
                                  test.slowMethod >= 10
                                    ? 'bg-red'
                                    : test.slowMethod >= 5
                                    ? 'bg-yellow'
                                    : test.slowMethod >= 1
                                    ? 'bg-green-300'
                                    : 'bg-green-500'
                                } px-3`}
                              >
                                {test.slowMethod}
                              </td>
                              <td className='px-3'>{test.os}</td>
                              <td className='px-3'>{test.nodeVersion}</td>
                              <td className='px-3'>
                                {test.on.split('_').join(' ')}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })}
              {reportCases.length == 0
                ? <div className='text-center my-5 text-5'>out of data</div>
                : null}
            </div>
          </div>
          <div className='flex justify-end mb-20 pr-3'>
            <Link className='flex no-wrap ' to='/'>
              <span className='text-blue-600 mt-7'>back</span>
              <span className='border-r-2 text-transparent border-b-2 w-2 h-2 border-blue-600 rotate--45 relative top-9.5 left-2 '>
              </span>
            </Link>
          </div>
        </div>
      );
    } else if (id === '02') {
      return (
        <div className='w-9/10 max-w-350 mx-auto cursor-default'>
          <h1 className='text-3xl md-pb-8 py-4'>{reportTitle}</h1>
          <h2 className='mb-5 text-lg text-gray-500'>
            {new Date(Date.now()).toDateString()}
          </h2>
          <div className='border-gray-200 border-1.5   bg-white shadow-md shadow-gray-200 '>
            <div className=''>
              {data.data.testCaseList.map((item, index) => {
                return (
                  <div>
                    <div
                      onClick={() => {
                        window.location.href =
                          `https://github.com/OfficeDev/TeamsFx/actions/runs/${item.runId}`;
                      }}
                      className='pl-5 flex justify-left items-center  text-gray-600 text-lg bg-blue-100 h-10 sticky top-0 hover:cursor-pointer'
                    >
                      run id: {item.runId}
                    </div>
                    <table className='table-auto w-full border-collapse border-1 border-gray-300 '>
                      <thead className='text-center  text-gray-600 text-sm'>
                        <tr className='h-10 sticky top-10 bg-white'>
                          <th>No.</th>
                          <th>
                            status
                          </th>
                          <th>report name</th>
                          <th>author</th>
                          <th>duration</th>
                          <th>target type</th>
                          <th>release version</th>
                          <th>OS</th>
                          <th>node version</th>
                          <th>on</th>
                        </tr>
                      </thead>
                      <tbody className='text-center border-gray-300 text-sm'>
                        {/* testcases */}
                        {item.testCase.map((test, index1) => {
                          return (
                            <tr
                              className={`h-10   hover:bg-gray-200 border-0.5 border-gray-200 ${
                                index1 % 2 === 0 ? 'bg-gray-100' : ''
                              }`}
                              key={test.jobId}
                            >
                              <td className='px-3'>{index1 + 1}</td>
                              <td>
                                <span
                                  className='material-icons'
                                  style={{ 'color': test.statusIconColor }}
                                >
                                  {test.statusIcon}
                                </span>
                              </td>
                              <td>
                                <Link
                                  target='_blank'
                                  className='hover:link cursor-pointer px-3'
                                  to={test.caseURL || '/'}
                                >
                                  {test.title}
                                </Link>
                              </td>
                              <td className='hover:link cursor-pointer px-3'>
                                <a
                                  href={test.author?.includes('@microsoft.com')
                                    ? `mailto:${test.author}`
                                    : `javascript:void()`}
                                >
                                  {test.author}
                                </a>
                              </td>
                              <td className='px-3 whitespace-nowrap'>
                                {computeTime(test.duration)}
                              </td>
                              <td className='px-3'>{test.targetType}</td>
                              <td className='px-3'>{test.releaseVersion}</td>
                              <td className='px-3'>{test.os}</td>
                              <td className='px-3'>{test.nodeVersion}</td>
                              <td className='px-3'>
                                {test.on.split('_').join(' ')}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })}
              {reportCases.length == 0
                ? <div className='text-center my-5 text-5'>out of data</div>
                : null}
            </div>
          </div>
          <div className='flex justify-end mb-20 pr-3'>
            <Link className='flex no-wrap ' to='/'>
              <span className='text-blue-600 mt-7'>back</span>
              <span className='border-r-2 text-transparent border-b-2 w-2 h-2 border-blue-600 rotate--45 relative top-9.5 left-2 '>
              </span>
            </Link>
          </div>
        </div>
      );
    } else if (id === '04') {
      return (
        <div className='w-9/10 max-w-350 mx-auto cursor-default'>
          <h1 className='text-3xl md-pb-8 py-4'>{reportTitle}</h1>
          <h2 className='mb-5 text-lg text-gray-500'>
            {new Date(Date.now()).toDateString()}
          </h2>
          <div className='border-gray-200 border-1.5   bg-white shadow-md shadow-gray-200 '>
            <div className=''>
              <table className='table-auto w-full border-collapse border-1 border-gray-300 '>
                <thead className='text-center  text-gray-600 text-sm'>
                  <tr className='h-10'>
                    <th>No.</th>
                    <th>
                      status
                    </th>
                    <th>report name</th>
                    <th>author</th>
                    <th>duration</th>
                    <th>OS</th>
                    <th>on</th>
                  </tr>
                </thead>
                <tbody className='text-center border-gray-300 text-sm'>
                  {/* testcases */}
                  {reportCases.map((item, index) => {
                    if (item.azure && item.azureTestResult && item._id) {
                      return (
                        <tr
                          className='h-10   hover:bg-gray-100 border-0.5 border-gray-200'
                          key={item._id.toString()}
                        >
                          <td>{index + 1}</td>
                          <td>
                            <span
                              className='material-icons'
                              style={{
                                'color':
                                  item.azureTestResult.outcome === 'Passed'
                                    ? 'green'
                                    : 'red',
                              }}
                            >
                              {item.azureTestResult.outcome === 'Passed'
                                ? 'check_circle'
                                : 'highlight_off'}
                            </span>
                          </td>
                          <td>
                            <Link
                              target='_blank'
                              className='hover:link cursor-pointer'
                              to={item.azure.caseURL || '/'}
                            >
                              {item.azureTestResult.testRun.name}
                            </Link>
                          </td>
                          <td className='hover:link cursor-pointer'>
                            <a
                              href={item.basic.author?.includes(
                                  '@microsoft.com',
                                )
                                ? `mailto:${item.basic.author}`
                                : `javascript:void()`}
                            >
                              {item.basic.author}
                            </a>
                          </td>
                          <td>
                            {computeTime(item.azureTestResult.durationInMs)}
                          </td>
                          <td>{item.azure.os}</td>
                          <td>{item.azure.on}</td>
                        </tr>
                      );
                    }
                  })}
                </tbody>
              </table>
              {reportCases.length == 0
                ? <div className='text-center my-5 text-5'>out of data</div>
                : null}
            </div>
          </div>
          <div className='flex justify-end mb-20 pr-3'>
            <Link className='flex no-wrap ' to='/'>
              <span className='text-blue-600 mt-7'>back</span>
              <span className='border-r-2 text-transparent border-b-2 w-2 h-2 border-blue-600 rotate--45 relative top-9.5 left-2 '>
              </span>
            </Link>
          </div>
        </div>
      );
    } else if (id === '05') {
      return (
        <div className='w-9/10 max-w-350 mx-auto cursor-default'>
          <h1 className='text-3xl md-pb-8 py-4'>{reportTitle}</h1>
          <h2 className='mb-5 text-lg text-gray-500'>
            {new Date(Date.now()).toDateString()}
          </h2>
          <div className='border-gray-200 border-1.5   bg-white shadow-md shadow-gray-200 '>
            <div className=''>
              {data.data.testCaseList.map((item: TestCaseSchema[]) => {
                return (
                  <div>
                    <div className='pl-5 flex justify-left items-center  text-gray-600 text-lg bg-blue-100 h-10 sticky top-0'>
                      run id: {item[0].runId as string}
                    </div>
                    <table className='table-auto w-full border-collapse border-1 border-gray-300 mb-5 '>
                      <thead className='text-center  text-gray-600 text-sm'>
                        <tr className='h-10'>
                          <th className='px-3'>No.</th>
                          <th className='px-3'>
                            status
                          </th>
                          <th className='px-3'>suite name</th>
                          <th className='px-3'>report name</th>
                          <th className='px-3'>author</th>
                          <th className='px-3'>duration</th>
                          <th className='px-3'>target type</th>
                          <th className='px-3'>OS</th>
                          <th className='px-3'>node version</th>
                          <th className='px-3'>on</th>
                        </tr>
                      </thead>
                      <tbody className='text-center border-gray-300 text-sm'>
                        {/* testcases */}
                        {item.map((test, index1) => {
                          return (
                            <tr
                              className={`h-10   hover:bg-gray-200 border-0.5 border-gray-200 ${
                                index1 % 2 === 0 ? 'bg-gray-100' : ''
                              }`}
                              key={test.jobId}
                            >
                              <td className='px-3'>{index1 + 1}</td>
                              <td className='px-3'>
                                <span
                                  className='material-icons'
                                  style={{ 'color': test.statusIconColor }}
                                >
                                  {test.statusIcon}
                                </span>
                              </td>
                              <td className='px-3'>
                                {test.suiteName && test.suiteName.split('-')[0]}
                              </td>
                              <td className='px-3'>
                                <Link
                                  target='_blank'
                                  className='hover:link cursor-pointer'
                                  to={test.caseURL || '/'}
                                >
                                  {test.title}
                                </Link>
                              </td>
                              <td className='hover:link cursor-pointer'>
                                <a
                                  href={test.author?.includes('@microsoft.com')
                                    ? `mailto:${test.author}`
                                    : `javascript:void()`}
                                >
                                  {test.author}
                                </a>
                              </td>
                              <td
                                className={test.duration > 10000
                                  ? 'bg-red'
                                  : test.duration > 5000
                                  ? 'bg-yellow'
                                  : test.duration > 2000
                                  ? 'bg-green-300'
                                  : 'bg-green-500'}
                              >
                                {computeTime(test.duration)}
                              </td>
                              <td className='px-3'>
                                {test.suiteName &&
                                    test.suiteName.includes('Node')
                                  ? 'Node'
                                  : 'Browser'}
                              </td>
                              <td className='px-3'>{test.os}</td>
                              <td className='px-3'>{test.nodeVersion}</td>
                              <td className='px-3'>
                                {test.on.split('_').join(' ')}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })}

              {reportCases.length == 0
                ? <div className='text-center my-5 text-5'>out of data</div>
                : null}
            </div>
          </div>
          <div className='flex justify-end mb-20 pr-3'>
            <Link className='flex no-wrap ' to='/'>
              <span className='text-blue-600 mt-7'>back</span>
              <span className='border-r-2 text-transparent border-b-2 w-2 h-2 border-blue-600 rotate--45 relative top-9.5 left-2 '>
              </span>
            </Link>
          </div>
        </div>
      );
    }
  };

  return (
    getContext(reportId)
  );
}
