// clean-reporter.js
class CleanReporter {
    constructor(globalConfig, options) {
        this._globalConfig = globalConfig;
        this._options = options;
        this._failedTests = [];
        this._totalTests = 0;
        this._passedTests = 0;
        this._failedTestsCount = 0;
    }

    cleanAnsi(str) {
        return str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
    }

    formatError(failureMessage) {
        const lines = this.cleanAnsi(failureMessage).split('\n');
        let formattedError = '';
        
        // Find the error message (usually after "Error:" or similar)
        const errorLine = lines.findIndex(line => line.match(/Error:|Received:|Expected:/));
        if (errorLine !== -1) {
            // Add the error message
            formattedError += '\n      Error Message:';
            formattedError += `\n        ${lines[errorLine]}`;
            
            // Add expected/received if they exist
            const expected = lines.find(line => line.includes('Expected:'));
            const received = lines.find(line => line.includes('Received:'));
            if (expected) formattedError += `\n        ${expected}`;
            if (received) formattedError += `\n        ${received}`;
            
            // Add stack trace (usually starts with "at")
            formattedError += '\n      Stack Trace:';
            const stackTrace = lines
                .filter(line => line.trim().startsWith('at '))
                .slice(0, 3) // Show only first 3 stack frames
                .map(line => `        ${line.trim()}`);
            formattedError += '\n' + stackTrace.join('\n');
            
            // Add diff if it exists
            const diffStart = lines.findIndex(line => line.includes('Difference:'));
            if (diffStart !== -1) {
                formattedError += '\n      Difference:';
                const diff = lines.slice(diffStart + 1)
                    .filter(line => line.trim())
                    .map(line => `        ${line}`);
                formattedError += '\n' + diff.join('\n');
            }
        } else {
            // Fallback if we can't parse the error format
            formattedError += '\n      ' + lines.join('\n      ');
        }
        
        return formattedError;
    }

    onRunStart() {
        this._failedTests = [];
        this._totalTests = 0;
        this._passedTests = 0;
        this._failedTestsCount = 0;
        this._startTime = Date.now();
        process.stdout.write('\nStarting Tests...\n\n');
    }

    onTestStart(test) {
        process.stdout.write(`Running ${test.path}\n`);
    }

    onTestResult(test, testResult) {
        process.stdout.write(`\nTest File: ${test.path}\n`);
        
        if (testResult.console && Array.isArray(testResult.console)) {
            const cleanOutput = testResult.console
                .map(entry => this.cleanAnsi(entry.message))
                .join('\n');
            process.stdout.write(cleanOutput + '\n');
        }

        // Update test counts
        testResult.testResults.forEach(result => {
            this._totalTests++;
            if (result.status === 'passed') {
                this._passedTests++;
            } else if (result.status === 'failed') {
                this._failedTestsCount++;
            }
        });

        // Store failed tests for later reporting
        const failedTests = testResult.testResults.filter(result => result.status === 'failed');
        if (failedTests.length > 0) {
            this._failedTests.push({
                testFile: test.path,
                failures: failedTests
            });
        }

        // Show all test results
        testResult.testResults.forEach(result => {
            const status = result.status.toUpperCase();
            const statusMark = status === 'PASSED' ? '✓' : '✗';
            process.stdout.write(`  ${statusMark} ${result.title} (${status})\n`);
        });
    }

    onRunComplete(results) {
        // Show failed test details
        if (this._failedTests.length > 0) {
            process.stdout.write('\nFailed Tests:\n');
            this._failedTests.forEach(({ testFile, failures }) => {
                process.stdout.write(`\nIn ${testFile}:\n`);
                failures.forEach(result => {
                    process.stdout.write(`\n  ✗ ${result.title}\n`);
                    result.failureMessages.forEach(msg => {
                        process.stdout.write(this.formatError(msg));
                    });
                    process.stdout.write('\n');
                });
            });
        }

        const duration = ((Date.now() - this._startTime) / 1000).toFixed(2);
        process.stdout.write('\nTest Summary:\n');
        process.stdout.write(`Total: ${this._totalTests}\n`);
        process.stdout.write(`Passed: ${this._passedTests}\n`);
        process.stdout.write(`Failed: ${this._failedTestsCount}\n`);
        process.stdout.write(`Time: ${duration}s\n\n`);
    }
}

module.exports = CleanReporter;