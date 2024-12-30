Feature: Theme Initialization and Management
  As a user of Graph Starz
  I want the application theme to load correctly on initial page load
  So that I can have a consistent and pleasant viewing experience without errors

  Background:
    Given the Graph Starz application is deployed
    And theme preferences can be stored in localStorage

  @critical @ssr
  Scenario: Server-side rendering compatibility
    Given the application is performing server-side rendering
    When the initial HTML is generated
    Then the ThemeProvider should be dynamically imported with SSR disabled
    And the initial theme state should be properly initialized
    And no hydration warnings should occur

  @critical @initialization
  Scenario: Theme provider initialization
    Given the ThemeProvider component is mounted
    When the useTheme hook is called by child components
    Then it should throw an error if used outside ThemeProvider
    And error boundaries should catch and handle the error gracefully
    And components should fail fast rather than use default values

  @ui @theme-toggle
  Scenario: Theme toggle functionality with SVG icons
    Given the application has loaded successfully
    And the ThemeProvider is properly initialized
    When I click the theme toggle button in the navbar
    Then I should see an SVG sun icon in dark mode
    And I should see an SVG moon icon in light mode
    And the theme preference should be saved to localStorage

  @windows @encoding
  Scenario: Windows environment compatibility
    Given the application is running in a Windows environment
    When the JavaScript files are processed
    Then all files should use consistent line endings
    And no trailing semicolons should be present (Next.js style)
    And no special characters or emojis should cause encoding issues

  @error-handling
  Scenario: Theme context error handling
    Given a component tries to access the theme context
    When the context is not available
    Then the useTheme hook should throw an error
    And error boundaries should catch the error
    And appropriate fallback UI should be displayed
    And error details should help developers identify the issue
