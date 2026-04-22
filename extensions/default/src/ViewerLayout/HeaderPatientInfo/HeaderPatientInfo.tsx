import React, { useState, useEffect } from 'react';
import usePatientInfo from '../../hooks/usePatientInfo';
import { Icons } from '@ohif/ui-next';

export enum PatientInfoVisibility {
  VISIBLE = 'visible',
  VISIBLE_COLLAPSED = 'visibleCollapsed',
  DISABLED = 'disabled',
  VISIBLE_READONLY = 'visibleReadOnly',
}

const formatWithEllipsis = (str, maxLength) => {
  if (str?.length > maxLength) {
    return str.substring(0, maxLength) + '...';
  }
  return str;
};

function HeaderPatientInfo({ servicesManager, appConfig }: withAppTypes) {
  const initialExpandedState = (() => {
    switch (appConfig.showPatientInfo) {
      case PatientInfoVisibility.VISIBLE:
      case PatientInfoVisibility.VISIBLE_READONLY:
        return true;
      default:
        return false;
    }
  })();
  const [expanded, setExpanded] = useState(initialExpandedState);
  const { patientInfo, isMixedPatients } = usePatientInfo(servicesManager);

  useEffect(() => {
    if (isMixedPatients) {
      setExpanded(false);
    }
  }, [isMixedPatients, expanded]);

  const handleOnClick = () => {
    if (isMixedPatients || appConfig.showPatientInfo === PatientInfoVisibility.VISIBLE_READONLY) {
      return;
    }

    setExpanded(!expanded);
  };

  const formattedPatientName = formatWithEllipsis(patientInfo.PatientName, 27);
  const formattedPatientID = formatWithEllipsis(patientInfo.PatientID, 15);
  let patientDobOrAge = patientInfo.PatientAge;

  if (patientInfo.PatientDOB != null) {
    patientDobOrAge = patientInfo.PatientDOB;
  }

  return (
    <div
      className="hover:bg-accent flex cursor-pointer items-center justify-center gap-1 rounded-lg"
      onClick={handleOnClick}
    >
      {isMixedPatients ? (
        <Icons.MultiplePatients className="text-primary" />
      ) : (
        <Icons.Patient className="text-primary" />
      )}
      <div className="flex flex-col justify-center">
        {expanded ? (
          <>
            <div className="text-foreground self-start text-[13px] font-bold">
              {formattedPatientName}
            </div>
            <div className="text-muted-foreground flex gap-2 text-[11px]">
              <div>{formattedPatientID}</div>
              <div>{patientInfo.PatientSex}</div>
              <div>{patientDobOrAge}</div>
            </div>
          </>
        ) : (
          <div className="text-primary self-center text-[13px]">
            {isMixedPatients ? 'Multiple Patients' : 'Patient'}
          </div>
        )}
      </div>
      <Icons.ArrowLeft className={`text-primary ${expanded ? 'rotate-180' : ''}`} />
    </div>
  );
}

export default HeaderPatientInfo;
