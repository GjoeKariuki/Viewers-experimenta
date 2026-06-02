import { mip } from './mip';
import { mipAndMpr } from './mipAndMpr';

function getFirstViewportOptions(protocol: typeof mip | typeof mipAndMpr) {
  return protocol.stages[0].viewports[0].displaySets[0].options;
}

describe('MIP hanging protocols', () => {
  it('starts the single MIP workflow in maximum intensity projection mode with a clinical slab', () => {
    expect(getFirstViewportOptions(mip)).toEqual(
      expect.objectContaining({
        blendMode: 'mip',
        slabThickness: 10,
      })
    );
  });

  it('starts the MIP overview in maximum intensity projection mode with a clinical slab', () => {
    expect(getFirstViewportOptions(mipAndMpr)).toEqual(
      expect.objectContaining({
        blendMode: 'mip',
        slabThickness: 10,
      })
    );
  });
});
