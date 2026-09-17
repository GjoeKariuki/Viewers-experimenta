import React from 'react';
import type { IconProps } from '../types';

const Disc = (props: IconProps) => (
  <svg
    width="26"
    height="26"
    viewBox="0 0 26 26"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <circle
      cx="12"
      cy="12"
      r="9"
    />
    <circle
      cx="12"
      cy="12"
      r="2"
    />
    <path d="M7 7l2 2m6 6 2 2M5.5 10l2.5 1m8 2 2.5 1" />
  </svg>
);

export default Disc;
