# Developer Rules

## Environment Variables and Configuration

1. **No Default Values**
   - Never use default values for environment variables or configuration settings
   - Fail fast and explicitly when required values are missing
   - This ensures issues are caught early in development rather than causing problems in production

2. **Required Environment Variables**
   - All required environment variables must be documented
   - Deployment scripts must validate that all required variables are present
   - Scripts should exit with a clear error message if any required variable is missing

3. **Environment Variable Validation**
   - Validate environment variables at startup
   - Include type checking and format validation where applicable
   - Provide clear error messages that indicate exactly which variable is missing or invalid

## Error Handling

1. **Fail Fast**
   - Detect and report errors as early as possible
   - Do not try to "guess" or use default values to handle missing configuration
   - Exit immediately with a descriptive error message when encountering critical issues

2. **Error Messages**
   - Error messages should be clear and actionable
   - Include specific details about what went wrong
   - Provide guidance on how to fix the issue

## Deployment Scripts

1. **Environment Checks**
   - All deployment scripts must verify their environment before proceeding
   - Check for required tools and dependencies
   - Validate all required environment variables
   - Verify network connectivity to required services

2. **No Silent Failures**
   - Scripts should not continue execution if prerequisites are not met
   - Each step should be validated
   - Use appropriate exit codes to indicate different types of failures