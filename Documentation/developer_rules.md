# Developer Rules

## Development Environment

1. **Windows PowerShell**
   - This project is designed to run in a Windows PowerShell environment
   - All scripts and commands should be PowerShell compatible
   - Use appropriate path separators (`\`) for Windows file paths

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

## Research Questions

1. **When to Ask Research Questions**
   - When encountering unclear behavior or unexpected test failures
   - When unsure about the correct implementation approach
   - When dealing with complex library interactions or edge cases
   - Before making assumptions about how a system should work
   - When mocking complex libraries with unclear internal behavior

2. **Research Question Format**
   - Questions should be specific and focused
   - Include relevant code snippets or test failures
   - Clearly state what you're trying to understand
   - Provide context about what you've already tried
   - For library mocking, include specific scenarios and expected behavior
   - Review existing implementations before proposing new solutions
   - Document any parallel or redundant implementations found
   - Justify the need for new implementations vs. extending existing ones

## Feature Integration Guidelines

1. **API Consistency**
   - Review all existing API endpoints before creating new ones
   - Maintain consistent data structures across related endpoints
   - Document any changes to API response formats
   - Update all affected components when modifying shared data structures
   - Follow established naming conventions and patterns
   - Ensure backward compatibility or document breaking changes

2. **Component Dependencies**
   - Map out all components affected by new features
   - Update tests for all modified components
   - Ensure mock data matches production data structures
   - Validate integration points with existing features
   - Document component relationships and data flow
   - Consider impact on existing features and user experience

3. **System Architecture**
   - Follow established architectural patterns
   - Maintain separation of concerns
   - Document architectural decisions and trade-offs
   - Consider scalability and maintainability
   - Ensure new features align with the overall system design
   - Update architecture diagrams when adding major features

4. **Data Consistency**
   - Use consistent data structures throughout the application
   - Document data schemas and transformations
   - Validate data at system boundaries
   - Handle edge cases and error conditions
   - Ensure proper error propagation
   - Maintain data integrity across components

## Code Quality

1. **Keep It Simple**
   - Solve problems using existing system features before creating new ones
   - Don't add complexity without clear justification
   - If a solution seems overly complex, it probably is
   - Question any solution that requires multiple new files or systems

## Testing

1. **Test File Organization**
   - Test files must end with `.test.js` extension
   - Test files should be placed in a `__tests__` directory adjacent to the code being tested
   - Mock files should be placed in a `__mocks__` directory adjacent to the code being mocked
   - Test utilities should be placed in a `__test_utils__` directory if needed

2. **Test Organization**
   - Group related tests logically
   - Test both success and error cases
   - Verify component interactions
   - Document complex test scenarios

3. **Mocking Best Practices**
   - Use Jest's mock system consistently
   - Place reusable mocks in `__mocks__` directory
   - Document mock behavior and limitations
   - Avoid duplicating mock logic across test files
   - For D3.js mocking:
     - Use the provided mock implementations in `__mocks__/d3Mock.js`
     - Ensure proper method chaining behavior
     - Mock both DOM manipulation and force simulation methods

4. **Test Configuration**
   - Keep Jest configuration clean and explicit
   - Document any special configuration needs
   - Use appropriate test patterns in jest.config.js
   - Configure coverage reporting appropriately
   - Exclude test files from coverage reports

5. **Test Coverage**
   - Aim for comprehensive test coverage
   - Test edge cases and error conditions
   - Include both unit and integration tests
   - Document any intentionally uncovered code

## Code Review Guidelines

1. **Feature Integration Review**
   - Verify alignment with existing features
   - Check for duplicate functionality
   - Review API consistency
   - Validate data structure compatibility
   - Ensure proper error handling
   - Check test coverage and quality

2. **Architecture Review**
   - Evaluate architectural fit
   - Review component interactions
   - Check scalability considerations
   - Verify maintainability
   - Review documentation updates
   - Consider security implications