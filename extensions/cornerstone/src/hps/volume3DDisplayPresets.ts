export const volume3DDisplayPresets = {
  CT: 'CT-Bone',

  // Do not force bone presets on non-CT modalities.
  // MR/PT/NM do not have reliable HU-based cortical bone separation.
  MR: 'MR-Default',
  PT: 'MR-MIP',
  NM: 'MR-MIP',

  // If your 3D feature is mainly for CT reconstruction, this is okay.
  default: 'CT-Bone',
};
