import { useState } from 'react';

export default function DatePicker(
  opts: { timeList: { month: string; year: number }[] },
) {
  const [currentCursor, setCurrentCursor] = useState(opts.timeList.length - 1);
  const changeLeftArrow = () => {
    if (currentCursor > 0) {
      setCurrentCursor(currentCursor - 1);
    }
  };
  const changeRightArrow = () => {
    if (currentCursor < opts.timeList.length - 1) {
      setCurrentCursor(currentCursor + 1);
    }
  };

  const baseClass =
    ' mx-5 flex justify-center items-center w-10 h-10 border-1 border-gray-200 rounded shadow hover:cursor-default';
  const rightEndClass = ' ';
  const rightClass = ' active:pl-2 hover:cursor-pointer hover:bg-gray-100 ';
  const leftEndClass = '  pl-2';
  const leftClass = ' active:pr-2 hover:cursor-pointer pl-2 hover:bg-gray-100';
  let rightPointClass = '';
  let leftPointClass = '';
  if (currentCursor === opts.timeList.length - 1) {
    rightPointClass = rightEndClass + ' ' + baseClass;
    leftPointClass = leftClass + ' ' + baseClass;
  } else if (currentCursor === 0) {
    rightPointClass = rightClass + ' ' + baseClass;
    leftPointClass = leftEndClass + ' ' + baseClass;
  } else {
    rightPointClass = rightClass + ' ' + baseClass;
    leftPointClass = leftClass + ' ' + baseClass;
  }

  return (
    <div className=' flex w-90  h-10 md-mt-10 md-ml-10 my-7 justify-between items-center scale-90 md-scale-100 dark:bg-gray-800 dark:text-white'>
      <div className={leftPointClass} onClick={changeLeftArrow}>
        <span
          className={currentCursor === 0
            ? 'material-icons text-gray-300'
            : 'material-icons'}
        >
          arrow_back_ios
        </span>
      </div>

      <p className='md-text-lg text-sm hover:cursor-default'>
        {opts.timeList[1].month + ' ' + opts.timeList[1].year + ' to ' +
          opts.timeList[3].month + ' ' + opts.timeList[3].year}
      </p>

      <div className={rightPointClass} onClick={changeRightArrow}>
        <span
          className={currentCursor === opts.timeList.length - 1
            ? 'material-icons text-gray-300'
            : 'material-icons'}
        >
          arrow_forward_ios
        </span>
      </div>
    </div>
  );
}
