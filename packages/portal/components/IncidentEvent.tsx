import { useState } from 'react';

import IncidentItem from './IncidentItem.tsx';

export default function IncidentEvent(opts: { eventList; month: string }) {
  const eventList = opts.eventList;
  const [isShown, toggleShow] = useState(true);
  const toggleShowHandler = () => {
    toggleShow(!isShown);
  };

  return (
    <div className='md-px-10 px-7 font-400 dark:bg-gray-800 dark:text-white'>
      <h2 className='text-7 hover:cursor-default'>{opts.month}</h2>
      <hr className='mt-2 text-gray-200 border-0.5 ' />
      <div className={isShown ? ` h-90 overflow-hidden px-5 ` : `px-5`}>
        {/* eventList */}
        {eventList.map((event, index) => (
          <IncidentItem
            key={index}
            eventTitle={event.eventTitle}
            eventSubTitle={event.eventSubTitle}
            eventTime={event.eventTime}
            status={event.status}
          />
        ))}
      </div>
      <div
        onClick={toggleShowHandler}
        className='border-0.5 border-gray-200 md-h-10 h-8 text-gray-400 flex justify-center items-center mb-6 relative top--0.3 bg-white text-gray-500 hover:bg-gray-50 hover:cursor-pointer shadow hover:border-gray-300 active:pl-1 active:pt-1 active:relative dark:bg-gray-800 dark:text-white'
      >
        <p className='text-3.5 md-text-4  '>
          {isShown
            ? '+ Show All ' + opts.eventList.length + ' Incidents'
            : '- collapse Incidents'}
        </p>
      </div>
    </div>
  );
}
