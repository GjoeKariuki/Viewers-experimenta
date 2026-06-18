import { fourUp } from './fourUp';
import { main3D } from './main3D';
import { mip } from './mip';
import { mipAndMpr } from './mipAndMpr';
import { mpr } from './mpr';
import { mprAnd3DVolumeViewport } from './mprAnd3DVolumeViewport';
import { primary3D } from './primary3D';
import { primaryAxial } from './primaryAxial';
import { DEFAULT_MIP_SLAB_THICKNESS } from '../utils/projectionUtils';

function getFirstViewportOptions(protocol) {
  return protocol.stages[0].viewports[0].displaySets[0].options;
}

function getMprDisplaySetOptions(protocol) {
  return protocol.stages[0].viewports
    .filter(viewport => viewport.viewportOptions.toolGroupId === 'mpr')
    .map(viewport => viewport.displaySets[0].options);
}

function expectMipDisplaySetOptions(options) {
  expect(options).toEqual(
    expect.objectContaining({
      blendMode: 'mip',
      slabThickness: DEFAULT_MIP_SLAB_THICKNESS,
    })
  );
}

describe('MIP hanging protocols', () => {
  it('starts the single MIP workflow in maximum intensity projection mode with a clinical slab', () => {
    expectMipDisplaySetOptions(getFirstViewportOptions(mip));
  });

  it('keeps the single MIP viewport aligned to the acquisition orientation with overlays visible', () => {
    const { viewportOptions } = mip.stages[0].viewports[0];

    expect(viewportOptions.orientation).toBe('acquisition');
    expect(viewportOptions.customViewportProps.hideOverlays).toBe(false);
  });

  it('starts the MIP overview in maximum intensity projection mode with a clinical slab', () => {
    expectMipDisplaySetOptions(getFirstViewportOptions(mipAndMpr));
  });

  it('starts all pure MPR panes as MIP-thickened MPR panes', () => {
    const mprOptions = getMprDisplaySetOptions(mpr);

    expect(mprOptions).toHaveLength(3);
    mprOptions.forEach(expectMipDisplaySetOptions);
  });

  it('starts the MIP and MPR combined layout with every volume pane in MIP mode', () => {
    const options = mipAndMpr.stages[0].viewports.map(viewport => viewport.displaySets[0].options);

    expect(options).toHaveLength(4);
    options.forEach(expectMipDisplaySetOptions);
  });

  it.each([
    ['main3D', main3D],
    ['mprAnd3DVolumeViewport', mprAnd3DVolumeViewport],
    ['fourUp', fourUp],
    ['primary3D', primary3D],
    ['primaryAxial', primaryAxial],
  ])('starts %s MPR panes in MIP mode', (_protocolName, protocol) => {
    const mprOptions = getMprDisplaySetOptions(protocol);

    expect(mprOptions).toHaveLength(3);
    mprOptions.forEach(expectMipDisplaySetOptions);
  });
});
