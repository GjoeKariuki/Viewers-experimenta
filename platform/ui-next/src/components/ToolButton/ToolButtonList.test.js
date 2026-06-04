import React from 'react';
import { render } from '@testing-library/react';

import { ToolButtonListItem } from './ToolButtonList';

describe('ToolButtonListItem', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('does not forward toolbar metadata props to the DOM button', () => {
    const { getByRole } = render(
      React.createElement(
        ToolButtonListItem,
        {
          id: 'WindowLevel',
          label: 'Window level',
          commands: { commandName: 'setToolActive' },
          evaluate: 'evaluate.cornerstoneTool',
          evaluateProps: { hideWhenDisabled: true },
          hideWhenDisabled: true,
          isActive: true,
          listeners: {},
          options: [{ id: 'window', type: 'button', values: [] }],
          visible: true,
          'data-cy': 'WindowLevel',
          'data-tool': 'WindowLevel',
          'data-active': true,
        },
        'Window level'
      )
    );

    const button = getByRole('button', { name: 'Window level' });

    expect(button.getAttribute('data-cy')).toBe('WindowLevel');
    expect(button.getAttribute('data-tool')).toBe('WindowLevel');
    expect(button.getAttribute('data-active')).toBe('true');
    expect(button.getAttribute('commands')).toBeNull();
    expect(button.getAttribute('evaluate')).toBeNull();
    expect(button.getAttribute('evaluateProps')).toBeNull();
    expect(button.getAttribute('hideWhenDisabled')).toBeNull();
    expect(button.getAttribute('isActive')).toBeNull();
    expect(button.getAttribute('label')).toBeNull();
    expect(button.getAttribute('listeners')).toBeNull();
    expect(button.getAttribute('options')).toBeNull();
    expect(button.getAttribute('visible')).toBeNull();

    const consoleMessages = consoleErrorSpy.mock.calls.flat().join('\n');
    expect(consoleMessages).not.toContain('React does not recognize the `evaluateProps` prop');
    expect(consoleMessages).not.toContain('non-boolean attribute `visible`');
  });
});
