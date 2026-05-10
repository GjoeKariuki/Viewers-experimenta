import { mip } from './mip';
import { mipAndMpr } from './mipAndMpr';

function getFirstViewportOptions(protocol: typeof mip | typeof mipAndMpr) {
  return protocol.stages[0].viewports[0].displaySets[0].options;
}

describe('MIP hanging protocols', () => {
  it('starts the single MIP workflow in minimum intensity projection mode', () => {
    expect(getFirstViewportOptions(mip)).toEqual(
      expect.objectContaining({
        blendMode: 'minip',
        slabThickness: 'minimum',
      })
    );
  });

  it('starts the MIP overview in minimum intensity projection mode', () => {
    expect(getFirstViewportOptions(mipAndMpr)).toEqual(
      expect.objectContaining({
        blendMode: 'minip',
        slabThickness: 'minimum',
      })
    );
  });
});
