import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import useViewerPrivacy, { setViewerPrivacy } from './useViewerPrivacy';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

it('updates every mounted consumer immediately and preserves privacy when panels remount', () => {
  const container = document.createElement('div');
  const root = createRoot(container);
  function Consumer() {
    return React.createElement('span', null, useViewerPrivacy() ? 'hidden' : 'visible');
  }
  act(() => {
    setViewerPrivacy(false);
    root.render(
      React.createElement(
        React.Fragment,
        null,
        React.createElement(Consumer),
        React.createElement(Consumer)
      )
    );
  });
  expect(container.textContent).toBe('visiblevisible');
  act(() => setViewerPrivacy(true));
  expect(container.textContent).toBe('hiddenhidden');
  act(() => root.render(null));
  act(() => root.render(React.createElement(Consumer)));
  expect(container.textContent).toBe('hidden');
  act(() => setViewerPrivacy(false));
  expect(container.textContent).toBe('visible');
  act(() => root.unmount());
});
