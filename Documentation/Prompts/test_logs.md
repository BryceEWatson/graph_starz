PS C:\Users\Bryce\Documents\Projects\graph_starz> yarn test
yarn run v1.22.22
$ cross-env NODE_ENV=test DEBUG=jest:* jest --colors=false --verbose --no-cache
  console.warn
    Node count approaching critical threshold.

      84 |                 return 'critical';
      85 |             } else if (count >= this.thresholds.nodeCountWarning) {
    > 86 |                 console.warn('Node count approaching critical threshold.');
         |                         ^
      87 |                 return 'warning';
      88 |             }
      89 |         }

      at PerformanceMonitor.warn [as updateNodeCount] (src/lib/d3/metrics/performanceMonitor.js:86:25)
      at Object.updateNodeCount (src/lib/d3/metrics/__tests__/performanceMonitor.test.js:36:24)

  console.warn
    Critical node count reached. Consider optimization strategies.                                                                                                                                                                                                       
                                                                                                                                                                                                                                                                         
      81 |         if (!options.silent) {                                                                                                                                                                                                                                
      82 |             if (count >= this.thresholds.nodeCountCritical) {                                                                                                                                                                                                 
    > 83 |                 console.warn('Critical node count reached. Consider optimization strategies.');                                                                                                                                                               
         |                         ^                                                                                                                                                                                                                                     
      84 |                 return 'critical';                                                                                                                                                                                                                            
      85 |             } else if (count >= this.thresholds.nodeCountWarning) {                                                                                                                                                                                           
      86 |                 console.warn('Node count approaching critical threshold.');                                                                                                                                                                                   
                                                                                                                                                                                                                                                                         
      at PerformanceMonitor.warn [as updateNodeCount] (src/lib/d3/metrics/performanceMonitor.js:83:25)
      at Object.updateNodeCount (src/lib/d3/metrics/__tests__/performanceMonitor.test.js:37:24)

 PASS  src/lib/d3/metrics/__tests__/performanceMonitor.test.js
  Jest Environment Setup                                                                                                                                                                                                                                                 
    √ TextEncoder/Decoder are defined (6 ms)                                                                                                                                                                                                                             
    √ DOM environment is properly setup (1 ms)                                                                                                                                                                                                                           
    √ Performance API is available                                                                                                                                                                                                                                       
  PerformanceMonitor                                                                                                                                                                                                                                                     
    √ initializes with correct default values (2 ms)                                                                                                                                                                                                                     
    √ records force calculation times correctly (1 ms)                                                                                                                                                                                                                   
    √ updates node count and returns correct status (30 ms)                                                                                                                                                                                                              
    √ maintains correct metrics array sizes (1 ms)                                                                                                                                                                                                                       
    √ calculates performance status correctly                                                                                                                                                                                                                            

 PASS  src/lib/d3/selection/__tests__/selectionManager.test.js                                                                                                                                                                                                           
  Jest Environment Setup
    √ TextEncoder/Decoder are defined (7 ms)                                                                                                                                                                                                                             
    √ DOM environment is properly setup                                                                                                                                                                                                                                  
    √ Performance API is available (1 ms)                                                                                                                                                                                                                                
  SelectionManager                                                                                                                                                                                                                                                       
    √ selectNode adds node to selection (3 ms)                                                                                                                                                                                                                           
    √ addToSelection allows multiple selections (1 ms)                                                                                                                                                                                                                   
    √ deselect removes node from selection (1 ms)                                                                                                                                                                                                                        
    √ toggleNode toggles selection state (1 ms)                                                                                                                                                                                                                          
    √ clearSelection removes all selections (1 ms)                                                                                                                                                                                                                       
    √ connected nodes are highlighted (1 ms)                                                                                                                                                                                                                             
    √ connected links are highlighted (1 ms)                                                                                                                                                                                                                             
                                                                                                                                                                                                                                                                         
C:\Users\Bryce\Documents\Projects\graph_starz\src\lib\config\env.js:545                                                                                                                                                                                                  
    throw new ConfigurationError(`Configuration error: ${error.message}`, 'general');
          ^

ConfigurationError: Configuration error: Invalid environment: test. Must be 'development' or 'production'
    at getConfig (C:\Users\Bryce\Documents\Projects\graph_starz\src\lib\config\env.js:473:15)
    at Object.<anonymous> (C:\Users\Bryce\Documents\Projects\graph_starz\src\lib\config\__tests__\env.test.js:227:37)
    at Promise.then.completed (C:\Users\Bryce\Documents\Projects\graph_starz\node_modules\jest-circus\build\utils.js:298:28)
    at new Promise (<anonymous>)
    at callAsyncCircusFn (C:\Users\Bryce\Documents\Projects\graph_starz\node_modules\jest-circus\build\utils.js:231:10)
    at _callCircusTest (C:\Users\Bryce\Documents\Projects\graph_starz\node_modules\jest-circus\build\run.js:316:40)
    at processTicksAndRejections (node:internal/process/task_queues:95:5)
    at _runTest (C:\Users\Bryce\Documents\Projects\graph_starz\node_modules\jest-circus\build\run.js:252:3)
    at _runTestsForDescribeBlock (C:\Users\Bryce\Documents\Projects\graph_starz\node_modules\jest-circus\build\run.js:126:9)
    at _runTestsForDescribeBlock (C:\Users\Bryce\Documents\Projects\graph_starz\node_modules\jest-circus\build\run.js:121:9)
    at _runTestsForDescribeBlock (C:\Users\Bryce\Documents\Projects\graph_starz\node_modules\jest-circus\build\run.js:121:9)
    at run (C:\Users\Bryce\Documents\Projects\graph_starz\node_modules\jest-circus\build\run.js:71:3)
    at runAndTransformResultsToJestFormat (C:\Users\Bryce\Documents\Projects\graph_starz\node_modules\jest-circus\build\legacy-code-todo-rewrite\jestAdapterInit.js:122:21)
    at jestAdapter (C:\Users\Bryce\Documents\Projects\graph_starz\node_modules\jest-circus\build\legacy-code-todo-rewrite\jestAdapter.js:79:19)
    at runTestInternal (C:\Users\Bryce\Documents\Projects\graph_starz\node_modules\jest-runner\build\runTest.js:367:16)
    at runTest (C:\Users\Bryce\Documents\Projects\graph_starz\node_modules\jest-runner\build\runTest.js:444:34)
    at Object.worker (C:\Users\Bryce\Documents\Projects\graph_starz\node_modules\jest-runner\build\testWorker.js:106:12) {
  category: 'general'
}

Node.js v20.12.2
 FAIL  src/lib/d3/__tests__/graphRender.test.js
  ● Test suite failed to run
                                                                                                                                                                                                                                                                         
    Jest encountered an unexpected token                                                                                                                                                                                                                                 
                                                                                                                                                                                                                                                                         
    Jest failed to parse a file. This happens e.g. when your code or its dependencies use non-standard JavaScript syntax, or when Jest is not configured to support such syntax.                                                                                         
                                                                                                                                                                                                                                                                         
    Out of the box Jest supports Babel, which will be used to transform your files into valid JS based on your Babel configuration.                                                                                                                                      
                                                                                                                                                                                                                                                                         
    By default "node_modules" folder is ignored by transformers.                                                                                                                                                                                                         

    Here's what you can do:
     • If you are trying to use ECMAScript Modules, see https://jestjs.io/docs/ecmascript-modules for how to enable it.
     • If you are trying to use TypeScript, see https://jestjs.io/docs/getting-started#using-typescript
     • To have some of your "node_modules" files transformed, you can specify a custom "transformIgnorePatterns" in your config.
     • If you need a custom transformation specify a "transform" option in your config.
     • If you simply want to mock your non-JS modules (e.g. binary assets) you can stub them out with the "moduleNameMapper" config option.

    You'll find more details and examples of these config options in the docs:
    https://jestjs.io/docs/configuration
    For information about custom transformations, see:
    https://jestjs.io/docs/code-transformation

    Details:

    C:\Users\Bryce\Documents\Projects\graph_starz\node_modules\internmap\src\index.js:1
    ({"Object.<anonymous>":function(module,exports,require,__dirname,__filename,jest){export class InternMap extends Map {
                                                                                      ^^^^^^

    SyntaxError: Unexpected token 'export'

      3 |  */
      4 |
    > 5 | import * as d3 from 'd3'
        | ^
      6 |
      7 | describe('D3 Graph Rendering', () => {
      8 |     let container

      at Runtime.createScriptFromCode (node_modules/jest-runtime/build/index.js:1505:14)
      at Object.require (node_modules/d3-array/src/group.js:1:1)
      at Object.require (node_modules/d3-array/src/index.js:12:1)
      at Object.require (node_modules/d3/src/index.js:1:1)
      at Object.require (src/lib/d3/__tests__/graphRender.test.js:5:1)

 FAIL  src/lib/d3/__tests__/nodeRendering.dom.test.js
  ● Test suite failed to run                                                                                                                                                                                                                                             
                                                                                                                                                                                                                                                                         
    Jest encountered an unexpected token                                                                                                                                                                                                                                 
                                                                                                                                                                                                                                                                         
    Jest failed to parse a file. This happens e.g. when your code or its dependencies use non-standard JavaScript syntax, or when Jest is not configured to support such syntax.                                                                                         
                                                                                                                                                                                                                                                                         
    Out of the box Jest supports Babel, which will be used to transform your files into valid JS based on your Babel configuration.                                                                                                                                      
                                                                                                                                                                                                                                                                         
    By default "node_modules" folder is ignored by transformers.                                                                                                                                                                                                         

    Here's what you can do:
     • If you are trying to use ECMAScript Modules, see https://jestjs.io/docs/ecmascript-modules for how to enable it.
     • If you are trying to use TypeScript, see https://jestjs.io/docs/getting-started#using-typescript
     • To have some of your "node_modules" files transformed, you can specify a custom "transformIgnorePatterns" in your config.
     • If you need a custom transformation specify a "transform" option in your config.
     • If you simply want to mock your non-JS modules (e.g. binary assets) you can stub them out with the "moduleNameMapper" config option.

    You'll find more details and examples of these config options in the docs:
    https://jestjs.io/docs/configuration
    For information about custom transformations, see:
    https://jestjs.io/docs/code-transformation

    Details:

    C:\Users\Bryce\Documents\Projects\graph_starz\node_modules\internmap\src\index.js:1
    ({"Object.<anonymous>":function(module,exports,require,__dirname,__filename,jest){export class InternMap extends Map {
                                                                                      ^^^^^^

    SyntaxError: Unexpected token 'export'

      2 |  * @jest-environment jsdom
      3 |  */
    > 4 | import * as d3 from 'd3'
        | ^
      5 | import { setupGraph } from '../setupGraph'
      6 |
      7 | console.log('nodeRendering.dom.test.js is loading')

      at Runtime.createScriptFromCode (node_modules/jest-runtime/build/index.js:1505:14)
      at Object.require (node_modules/d3-array/src/group.js:1:1)
      at Object.require (node_modules/d3-array/src/index.js:12:1)
      at Object.require (node_modules/d3/src/index.js:1:1)
      at Object.require (src/lib/d3/__tests__/nodeRendering.dom.test.js:4:1)

 FAIL  src/lib/d3/__tests__/hover.dom.test.js
  ● Test suite failed to run                                                                                                                                                                                                                                             
                                                                                                                                                                                                                                                                         
    Jest encountered an unexpected token                                                                                                                                                                                                                                 
                                                                                                                                                                                                                                                                         
    Jest failed to parse a file. This happens e.g. when your code or its dependencies use non-standard JavaScript syntax, or when Jest is not configured to support such syntax.                                                                                         
                                                                                                                                                                                                                                                                         
    Out of the box Jest supports Babel, which will be used to transform your files into valid JS based on your Babel configuration.                                                                                                                                      
                                                                                                                                                                                                                                                                         
    By default "node_modules" folder is ignored by transformers.                                                                                                                                                                                                         

    Here's what you can do:
     • If you are trying to use ECMAScript Modules, see https://jestjs.io/docs/ecmascript-modules for how to enable it.
     • If you are trying to use TypeScript, see https://jestjs.io/docs/getting-started#using-typescript
     • To have some of your "node_modules" files transformed, you can specify a custom "transformIgnorePatterns" in your config.
     • If you need a custom transformation specify a "transform" option in your config.
     • If you simply want to mock your non-JS modules (e.g. binary assets) you can stub them out with the "moduleNameMapper" config option.

    You'll find more details and examples of these config options in the docs:
    https://jestjs.io/docs/configuration
    For information about custom transformations, see:
    https://jestjs.io/docs/code-transformation

    Details:

    C:\Users\Bryce\Documents\Projects\graph_starz\node_modules\internmap\src\index.js:1
    ({"Object.<anonymous>":function(module,exports,require,__dirname,__filename,jest){export class InternMap extends Map {
                                                                                      ^^^^^^

    SyntaxError: Unexpected token 'export'

      1 | /** @jest-environment jsdom */
    > 2 | import * as d3 from 'd3'
        | ^
      3 | import { applyNodeState } from '../interactions/hover'
      4 |
      5 | describe('Hover DOM Effects', () => {

      at Runtime.createScriptFromCode (node_modules/jest-runtime/build/index.js:1505:14)
      at Object.require (node_modules/d3-array/src/group.js:1:1)
      at Object.require (node_modules/d3-array/src/index.js:12:1)
      at Object.require (node_modules/d3/src/index.js:1:1)
      at Object.require (src/lib/d3/__tests__/hover.dom.test.js:2:1)

C:\Users\Bryce\Documents\Projects\graph_starz\src\lib\config\env.js:545
    throw new ConfigurationError(`Configuration error: ${error.message}`, 'general');
          ^

ConfigurationError: Configuration error: Invalid environment: test. Must be 'development' or 'production'
    at getConfig (C:\Users\Bryce\Documents\Projects\graph_starz\src\lib\config\env.js:473:15)
    at Object.<anonymous> (C:\Users\Bryce\Documents\Projects\graph_starz\src\lib\config\__tests__\env.test.js:227:37)
    at Promise.then.completed (C:\Users\Bryce\Documents\Projects\graph_starz\node_modules\jest-circus\build\utils.js:298:28)
    at new Promise (<anonymous>)
    at callAsyncCircusFn (C:\Users\Bryce\Documents\Projects\graph_starz\node_modules\jest-circus\build\utils.js:231:10)
    at _callCircusTest (C:\Users\Bryce\Documents\Projects\graph_starz\node_modules\jest-circus\build\run.js:316:40)
    at processTicksAndRejections (node:internal/process/task_queues:95:5)
    at _runTest (C:\Users\Bryce\Documents\Projects\graph_starz\node_modules\jest-circus\build\run.js:252:3)
    at _runTestsForDescribeBlock (C:\Users\Bryce\Documents\Projects\graph_starz\node_modules\jest-circus\build\run.js:126:9)
    at _runTestsForDescribeBlock (C:\Users\Bryce\Documents\Projects\graph_starz\node_modules\jest-circus\build\run.js:121:9)
    at _runTestsForDescribeBlock (C:\Users\Bryce\Documents\Projects\graph_starz\node_modules\jest-circus\build\run.js:121:9)
    at run (C:\Users\Bryce\Documents\Projects\graph_starz\node_modules\jest-circus\build\run.js:71:3)
    at runAndTransformResultsToJestFormat (C:\Users\Bryce\Documents\Projects\graph_starz\node_modules\jest-circus\build\legacy-code-todo-rewrite\jestAdapterInit.js:122:21)
    at jestAdapter (C:\Users\Bryce\Documents\Projects\graph_starz\node_modules\jest-circus\build\legacy-code-todo-rewrite\jestAdapter.js:79:19)
    at runTestInternal (C:\Users\Bryce\Documents\Projects\graph_starz\node_modules\jest-runner\build\runTest.js:367:16)
    at runTest (C:\Users\Bryce\Documents\Projects\graph_starz\node_modules\jest-runner\build\runTest.js:444:34)
    at Object.worker (C:\Users\Bryce\Documents\Projects\graph_starz\node_modules\jest-runner\build\testWorker.js:106:12) {
  category: 'general'
}

Node.js v20.12.2
C:\Users\Bryce\Documents\Projects\graph_starz\src\lib\config\env.js:545
    throw new ConfigurationError(`Configuration error: ${error.message}`, 'general');
          ^

ConfigurationError: Configuration error: Invalid environment: test. Must be 'development' or 'production'
    at getConfig (C:\Users\Bryce\Documents\Projects\graph_starz\src\lib\config\env.js:473:15)
    at Object.<anonymous> (C:\Users\Bryce\Documents\Projects\graph_starz\src\lib\config\__tests__\env.test.js:227:37)
    at Promise.then.completed (C:\Users\Bryce\Documents\Projects\graph_starz\node_modules\jest-circus\build\utils.js:298:28)
    at new Promise (<anonymous>)
    at callAsyncCircusFn (C:\Users\Bryce\Documents\Projects\graph_starz\node_modules\jest-circus\build\utils.js:231:10)
    at _callCircusTest (C:\Users\Bryce\Documents\Projects\graph_starz\node_modules\jest-circus\build\run.js:316:40)
    at processTicksAndRejections (node:internal/process/task_queues:95:5)
    at _runTest (C:\Users\Bryce\Documents\Projects\graph_starz\node_modules\jest-circus\build\run.js:252:3)
    at _runTestsForDescribeBlock (C:\Users\Bryce\Documents\Projects\graph_starz\node_modules\jest-circus\build\run.js:126:9)
    at _runTestsForDescribeBlock (C:\Users\Bryce\Documents\Projects\graph_starz\node_modules\jest-circus\build\run.js:121:9)
    at _runTestsForDescribeBlock (C:\Users\Bryce\Documents\Projects\graph_starz\node_modules\jest-circus\build\run.js:121:9)
    at run (C:\Users\Bryce\Documents\Projects\graph_starz\node_modules\jest-circus\build\run.js:71:3)
    at runAndTransformResultsToJestFormat (C:\Users\Bryce\Documents\Projects\graph_starz\node_modules\jest-circus\build\legacy-code-todo-rewrite\jestAdapterInit.js:122:21)
    at jestAdapter (C:\Users\Bryce\Documents\Projects\graph_starz\node_modules\jest-circus\build\legacy-code-todo-rewrite\jestAdapter.js:79:19)
    at runTestInternal (C:\Users\Bryce\Documents\Projects\graph_starz\node_modules\jest-runner\build\runTest.js:367:16)
    at runTest (C:\Users\Bryce\Documents\Projects\graph_starz\node_modules\jest-runner\build\runTest.js:444:34)
    at Object.worker (C:\Users\Bryce\Documents\Projects\graph_starz\node_modules\jest-runner\build\testWorker.js:106:12) {
  category: 'general'
}

Node.js v20.12.2
C:\Users\Bryce\Documents\Projects\graph_starz\src\lib\config\env.js:545
    throw new ConfigurationError(`Configuration error: ${error.message}`, 'general');
          ^

ConfigurationError: Configuration error: Invalid environment: test. Must be 'development' or 'production'
    at getConfig (C:\Users\Bryce\Documents\Projects\graph_starz\src\lib\config\env.js:473:15)
    at Object.<anonymous> (C:\Users\Bryce\Documents\Projects\graph_starz\src\lib\config\__tests__\env.test.js:227:37)
    at Promise.then.completed (C:\Users\Bryce\Documents\Projects\graph_starz\node_modules\jest-circus\build\utils.js:298:28)
    at new Promise (<anonymous>)
    at callAsyncCircusFn (C:\Users\Bryce\Documents\Projects\graph_starz\node_modules\jest-circus\build\utils.js:231:10)
    at _callCircusTest (C:\Users\Bryce\Documents\Projects\graph_starz\node_modules\jest-circus\build\run.js:316:40)
    at processTicksAndRejections (node:internal/process/task_queues:95:5)
    at _runTest (C:\Users\Bryce\Documents\Projects\graph_starz\node_modules\jest-circus\build\run.js:252:3)
    at _runTestsForDescribeBlock (C:\Users\Bryce\Documents\Projects\graph_starz\node_modules\jest-circus\build\run.js:126:9)
    at _runTestsForDescribeBlock (C:\Users\Bryce\Documents\Projects\graph_starz\node_modules\jest-circus\build\run.js:121:9)
    at _runTestsForDescribeBlock (C:\Users\Bryce\Documents\Projects\graph_starz\node_modules\jest-circus\build\run.js:121:9)
    at run (C:\Users\Bryce\Documents\Projects\graph_starz\node_modules\jest-circus\build\run.js:71:3)
    at runAndTransformResultsToJestFormat (C:\Users\Bryce\Documents\Projects\graph_starz\node_modules\jest-circus\build\legacy-code-todo-rewrite\jestAdapterInit.js:122:21)
    at jestAdapter (C:\Users\Bryce\Documents\Projects\graph_starz\node_modules\jest-circus\build\legacy-code-todo-rewrite\jestAdapter.js:79:19)
    at runTestInternal (C:\Users\Bryce\Documents\Projects\graph_starz\node_modules\jest-runner\build\runTest.js:367:16)
    at runTest (C:\Users\Bryce\Documents\Projects\graph_starz\node_modules\jest-runner\build\runTest.js:444:34)
    at Object.worker (C:\Users\Bryce\Documents\Projects\graph_starz\node_modules\jest-runner\build\testWorker.js:106:12) {
  category: 'general'
}

Node.js v20.12.2
 FAIL  src/lib/config/__tests__/env.test.js
  ● Test suite failed to run                                                                                                                                                                                                                                             
                                                                                                                                                                                                                                                                         
    Jest worker encountered 4 child process exceptions, exceeding retry limit                                                                                                                                                                                            
                                                                                                                                                                                                                                                                         
      at ChildProcessWorker.initialize (node_modules/jest-worker/build/workers/ChildProcessWorker.js:181:21)                                                                                                                                                             
                                                                                                                                                                                                                                                                         
Test Suites: 4 failed, 2 passed, 6 total
Tests:       18 passed, 18 total