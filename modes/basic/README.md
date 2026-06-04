# basic
## Description
A basic mode used to build other modes on top of
## Author
OHIF Contributors
## License
MIT
# Basic Mode

## Description

`modes/basic` is the main viewer mode used in this repo for general image-viewing
workflows. It provides the standard toolbar, study browser, measurements panel,
MPR/MIP actions, and the projection controls used by the custom work on this
branch.

## Key Files

- `src/index.tsx`
  Defines the mode entry point, toolbar sections, side panels, and viewport action menus.
- `src/toolbarButtons.ts`
  Contains the primary toolbar buttons, split menus, MPR/MIP actions, presets, and
  projection controls.
- `src/initToolGroups.ts`
  Sets up the cornerstone tool groups for stack, MPR, and MIP workflows.

## Development Notes

- MIP, MPR, and projection controls are wired through the basic mode toolbar
  definitions and the cornerstone toolbar evaluators.
- If you are debugging projection behavior, start with:
  `extensions/cornerstone/src/getToolbarModule.tsx`,
  `extensions/cornerstone/src/commandsModule.ts`, and
  `extensions/cornerstone/src/components/WindowLevelActionMenu/`.
- Thumbnail recovery and layout fallback behavior is implemented in
  `extensions/default/src/customizations/studyBrowserCustomization.ts`.

## Author

OHIF Contributors

## License

MIT
