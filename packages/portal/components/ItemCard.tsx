import { FailuresSchema, testStatus } from '~/utils/schema.ts';
import { Link, useRouter } from 'aleph/react';
import { useEffect, useState } from 'react';
/*
enum testStatus {
  operational = "All Systems Operational",
  partial_failed = "Partial Failed",
  partial_passed = "Partial Passed",
  panic = "Panic",
  out_of_data = "Out of Data"
}
*/
export default function ItemCard(
  opts: {
    status: testStatus;
    title: string;
    reportID: '01' | '02' | '03' | '04' | '05' | '06';
    failedCases: FailuresSchema[];
    slowMethods: number;
    totalCases: number;
  },
) {
  let bgColor = '';
  let color = '';
  let statusIcon = '';
  const status = opts.status;
  const baseClass = 'material-icons hover:cursor-default';
  if (status === testStatus.operational) {
    bgColor = 'bg-green-500';
    color = 'success';
    statusIcon = 'check_circle';
  } else if (status === testStatus.partial_failed) {
    bgColor = 'bg-yellow-500';
    color = 'warning';
    statusIcon = 'report_problem';
  } else if (status === testStatus.partial_passed) {
    bgColor = 'bg-danger';
    color = 'danger';
    statusIcon = 'report_problem';
  } else if (status === testStatus.panic) {
    bgColor = 'bg-error';
    color = 'error';
    statusIcon = 'highlight_off';
  } else {
    bgColor = 'bg-gray-400';
    color = 'text-gray-400';
    statusIcon = 'help_outline';
  }

  const countFailure = (failedCases: FailuresSchema[]) => {
    let count = 0;
    failedCases.forEach((item) => {
      count += item.failureCases.length;
    });
    return count;
  };

  // const [hideTips, changeTips] = useState(false)

  return (
    <div className='bg-white border-gray-200  border-0.5 md-w-1/2 h-23 px-5 flex justify-center flex-col hover:bg-gray-100 dark:bg-gray-800 dark:text-white'>
      <div className='flex justify-between'>
        <div className='flex items-center'>
          <Link
            className={`text-4.5 mr-3 ${
              status !== testStatus.out_of_data
                ? 'hover:cursor-pointer hover:text-blue hover:underline'
                : 'hover:cursor-default'
            }`}
            to={status !== testStatus.out_of_data
              ? `/report/${opts.reportID}`
              : '/'}
          >
            {opts.title}
          </Link>
        </div>
        <div className=' flex items-center text-white cursor-default'>
          {/* <div className={`border-0.5 rounded mx-1 border-gray px-2 py-0.5 text-3 ${opts.slowMethods?'bg-yellow-600':opts.status !== testStatus.out_of_data?'bg-green-600':'hidden'}`}>{`${opts.slowMethods} methods slow`}</div> */}
          <div className='flex justify-center items-center mr-3'>
            {opts.failedCases?.map((item, index) => {
              return (
                <div
                  onClick={() => window.location.href = `mailto:${item.author}`}
                  className={`w-6 h-6 rounded-full bg-blue mr-1 flex justify-center items-center text-sm shadow-md border-yellow-800 cursor-pointer active:mr-1 active:mt-1`}
                  key={index}
                >
                  {item.author}
                </div>
              );
            })}
          </div>
          <div
            className={`border-0.5 rounded mx-1 border-gray-300 px-2 py-0.5 text-3 ${bgColor}`}
          >
            {opts.failedCases?.length
              ? `${
                countFailure(opts.failedCases)
              }/${opts.totalCases} cases failed`
              : opts.status === testStatus.out_of_data
              ? ' Cases not found'
              : `${opts.totalCases}/${opts.totalCases} Cases goes fine`}
          </div>
        </div>
        <div className=''>
          <span className={color + ' ' + baseClass}>
            {statusIcon}
          </span>
        </div>
      </div>
    </div>
  );
}
