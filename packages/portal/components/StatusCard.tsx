import { testStatus } from '~/utils/schema.ts';
/*
    type status = "operational" | "degraded_performance" | "partial_outage" | "major_outage"
*/

export default function StatusCard(opts: { status: testStatus }) {
  let bgColor = '';
  let statusText = '';
  let statusIcon = '';
  const status = opts.status;
  const baseClass = 'rounded-md mt-30 ';
  if (status === testStatus.operational) {
    bgColor = 'bg-green-600';
    statusText = 'All Systems Operational';
    statusIcon = 'check_circle';
  } else if (status === testStatus.partial_failed) {
    bgColor = 'bg-yellow-600';
    statusText = 'Degraded Performance';
    statusIcon = 'report_problem';
  } else if (status === testStatus.partial_passed) {
    bgColor = 'bg-orange-600';
    statusText = 'Partial Outage';
    statusIcon = 'report_problem';
  } else if (status === testStatus.panic) {
    bgColor = 'bg-pink-700';
    statusText = 'Oposss!!! Something went wrong...';
    statusIcon = 'highlight_off';
  }
  bgColor = baseClass + ' ' + bgColor;

  return (
    <div className={bgColor}>
      <div className='flex md-h-13 h-10 flex items-center text-white hover:cursor-default shadow-lg'>
        {/* icon */}
        <div className='mx-5 flex justify-center items-center'>
          <span className='material-icons'>
            {statusIcon}
          </span>
        </div>
        <p className='text-xl font-bold'>{statusText}</p>
      </div>
    </div>
  );
}
