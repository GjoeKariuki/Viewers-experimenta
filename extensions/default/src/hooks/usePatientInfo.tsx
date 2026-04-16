import { useState, useEffect } from 'react';
import { utils, useSystem } from '@ohif/core';

const { formatPN, formatDate } = utils;

const formatAge = age => {
  if (!age) {
    return null;
  }

  const match = `${age}`.match(/^(\d+)([DWMY])$/i);
  if (!match) {
    return age;
  }

  const [, value, unit] = match;
  const numericValue = parseInt(value, 10);
  const normalizedValue = String(numericValue);
  const normalizedUnit = unit.toUpperCase();
  const unitLabels = {
    D: ['day', 'days'],
    W: ['week', 'weeks'],
    M: ['month', 'months'],
    Y: ['year', 'years'],
  };

  const [singular, plural] = unitLabels[normalizedUnit] || [];
  if (!singular || !plural) {
    return age;
  }

  return `${normalizedValue} ${numericValue === 1 ? singular : plural}`;
};

function usePatientInfo() {
  const { servicesManager } = useSystem();
  const { displaySetService } = servicesManager.services;

  const [patientInfo, setPatientInfo] = useState({
    PatientName: '',
    PatientID: '',
    PatientSex: '',
    PatientDOB: '',
    PatientAge: '',
  });
  const [isMixedPatients, setIsMixedPatients] = useState(false);

  const checkMixedPatients = (PatientID: string) => {
    const displaySets = displaySetService.getActiveDisplaySets();
    let isMixedPatients = false;
    displaySets.forEach(displaySet => {
      const instance = displaySet?.instances?.[0] || displaySet?.instance;
      if (!instance) {
        return;
      }
      if (instance.PatientID !== PatientID) {
        isMixedPatients = true;
      }
    });
    setIsMixedPatients(isMixedPatients);
  };

  const updatePatientInfo = ({ displaySetsAdded }: { displaySetsAdded: any[] }) => {
    if (!displaySetsAdded.length) {
      return;
    }
    const displaySet = displaySetsAdded[0];
    const instance = displaySet?.instances?.[0] || displaySet?.instance;
    if (!instance) {
      return;
    }

    setPatientInfo({
      PatientID: instance.PatientID || null,
      PatientName: instance.PatientName ? formatPN(instance.PatientName) : null,
      PatientSex: instance.PatientSex || null,
      PatientDOB: formatDate(instance.PatientBirthDate) || null,
      PatientAge: formatAge(instance.PatientAge) || null,
    });
    checkMixedPatients(instance.PatientID || null);
  };

  useEffect(() => {
    const subscription = displaySetService.subscribe(
      displaySetService.EVENTS.DISPLAY_SETS_ADDED,
      props => updatePatientInfo(props as { displaySetsAdded: any[] })
    );
    return () => subscription.unsubscribe();
  }, []);

  return { patientInfo, isMixedPatients };
}

export default usePatientInfo;
