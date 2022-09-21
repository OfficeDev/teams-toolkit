import { Link, useData, useForwardProps } from 'aleph/react';
import StatusCard from '~/components/StatusCard.tsx';
import ItemCard from '~/components/ItemCard.tsx';
import Sprint from '~/components/Sprint.tsx';
import { ReportSchema, testStatus, VersionSchema } from '~/utils/schema.ts';
import { getReportStatus, initItemCards } from '~/utils/tools.ts';
import Coverage from '~/components/Coverage.tsx';

export default function Index(): JSX.Element {
  const { data } = useForwardProps<
    {
      data: {
        data: {
          testReport: { data: ReportSchema[] };
          versionList: { data: VersionSchema[] };
          coverage: string;
        };
      };
    }
  >();
  const { testReport, versionList, coverage } = data.data;
  const indexData: { totalStatus: testStatus; reportList: ReportSchema[] } =
    getReportStatus(testReport.data);

  const mainStatusTitle = 'Current Status';
  const itemCards = initItemCards(indexData.reportList);
  itemCards.forEach((item) => {
    localStorage.setItem(item.reportId, JSON.stringify(item));
  });
  // console.log(itemCards)

  return (
    <div className='dark:bg-gray-800 dark:text-white'>
      {/* main */}

      <div className='w-9/10 max-w-350 mx-auto relative md-top--28'>
        {/* status card */}
        <StatusCard status={indexData.totalStatus} />
        <h1 className='text-3xl my-8 hover:cursor-default mx-3'>
          {mainStatusTitle}
        </h1>

        {/* item card */}
        <div className='flex md-flex-wrap md-flex-row flex-col shadow-md shadow-gray-200 mx-3'>
          {itemCards.map((item) => {
            if (item.reportId === '05') {
              return (
                <ItemCard
                  key={item.reportId}
                  title={item.reportName}
                  status={item.reportResultStatus}
                  failedCases={item.testCaseFailures}
                  reportID={item.reportId}
                  slowMethods={item.slowMethods}
                  totalCases={item?.testCaseList?.flat().length}
                />
              );
            } else if (item.reportId === '04') {
              return (
                <ItemCard
                  key={item.reportId}
                  title={item.reportName}
                  status={item.reportResultStatus}
                  failedCases={item.testCaseFailures}
                  reportID={item.reportId}
                  slowMethods={item.slowMethods}
                  totalCases={item?.reportCases?.length ?? 0}
                />
              );
            }
            {
              return (
                <ItemCard
                  key={item.reportId}
                  title={item.reportName}
                  status={item.reportResultStatus}
                  failedCases={item.testCaseFailures}
                  reportID={item.reportId}
                  slowMethods={item.slowMethods}
                  totalCases={item?.reportCases?.length ?? 0}
                />
              );
            }
          })}
        </div>

        <hr className='mt-10 text-gray-200 border-1.5' />

        <div className='flex justify-around'>
          <Sprint versionList={versionList.data}></Sprint>

          <Coverage coverage={coverage}></Coverage>
        </div>

        {/* footer */}
        <hr className='mt-10 text-gray-200 border-1.5' />
        <div className='pa-3 text-gray-400 text-4 flex justify-center'>teamsfx portal - v1.6.2</div>
        {
          /* <div className="flex justify-end mb-20 pr-3">
          <Link className="flex no-wrap" to="/history">
            <span className="text-blue-600 mt-7">Incident History </span>
            <span className="border-r-2 text-transparent border-b-2 w-2 h-2 border-blue-600 rotate--45 relative top-9.5 left-2 "></span>
          </Link>
        </div> */
        }
      </div>
    </div>
  );
}
