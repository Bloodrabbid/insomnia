import React, { useEffect } from 'react';
import { useNavigate } from 'react-router';

import { SegmentEvent } from '../analytics';

const Login = () => {
  const navigate = useNavigate();

  // В локальной версии сразу перенаправляем в Scratch Pad
  useEffect(() => {
    window.main.trackSegmentEvent({
      event: SegmentEvent.selectScratchpad,
    });
    navigate('/organization/org_scratchpad/project/proj_scratchpad/workspace/wrk_scratchpad/debug');
  }, [navigate]);

  return (
    <div className="flex flex-col gap-[--padding-lg]">
      <div className="flex flex-col gap-[--padding-md]">
        <p className="py-[--padding-md] text-center text-2xl text-[--color-font]">Локальная версия Insomnia</p>
        <div className="text-sm">
          <span className="text-[--color-font]">Перенаправление в локальный Scratch Pad...</span>
        </div>
      </div>
    </div>
  );
};

export default Login;
