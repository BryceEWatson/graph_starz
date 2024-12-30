# Task: Fix initial load blank page

## Background

On the initial load of the our application we see this error:
"""
TypeError: Cannot destructure property 'theme' of '(0 , _ThemeProvider__WEBPACK_IMPORTED_MODULE_2__.useTheme)(...)' as it is undefined.
    at Navbar (webpack-internal:///(app-pages-browser)/./src/components/Navbar.js:21:13)
    at react-stack-bottom-frame (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:22339:20)
    at renderWithHooks (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:5731:22)
    at updateFunctionComponent (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:7992:19)
    at beginWork (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:9606:35)
    at runWithFiberInDEV (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:544:16)
    at performUnitOfWork (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14986:22)
    at workLoopSync (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14816:41)
    at renderRootSync (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14794:11)
    at performWorkOnRoot (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14329:46)
    at performWorkOnRootViaSchedulerTask (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:15843:7)
    at MessagePort.performWorkUntilDeadline (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/scheduler/cjs/scheduler.development.js:44:48)
"""

## Task details

Review the templating logic used in this next.js application and then work on creating a detailed .feature file that we can use to describe the expected behavior before and after the bug fix.

Note that all .feature files go in Documentation/BDD/product/