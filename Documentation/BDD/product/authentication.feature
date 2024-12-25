Feature: User Authentication
  As a user
  I want to sign in with my Google account
  So that I can access the platform's features and maintain my profile

  Background:
    Given I am on the platform's landing page
    And I am not currently signed in

  Scenario: Successful Google Sign In
    When I click the "Sign in with Google" button
    Then I should be redirected to Google's authentication page
    And I should be able to select my Google account
    When I authorize the application
    Then I should be redirected back to the platform
    And I should see my profile information:
      | Field             | Description                                    |
      | Name             | My Google account name                        |
      | Email            | My Gmail address                              |
      | Profile Picture  | My Google profile picture                     |
    And I should be able to access authenticated features

  Scenario: Gmail Requirement
    Given I attempt to sign in with Google
    When I select a non-Gmail account
    Then I should see an "Access Denied" error
    And I should be informed that only Gmail accounts are supported
    And I should remain signed out

  Scenario: Email Verification
    Given I attempt to sign in with Google
    When I select an unverified Gmail account
    Then I should see an "Email Verification Required" error
    And I should be informed that email verification is required
    And I should remain signed out

  Scenario: Session Management
    Given I am signed in
    Then my session should:
      | Property          | Description                                    |
      | Duration         | Last for 30 days                              |
      | Update Interval  | Refresh every 24 hours                        |
      | Token            | Include access token and user details         |
    When I return to the platform within the session duration
    Then I should be automatically signed in
    And my user context should be preserved

  Scenario: User Profile Creation
    Given I sign in for the first time
    Then the system should:
      | Action            | Description                                    |
      | Create Profile   | Create a new user node in Neo4j               |
      | Store Details    | Save my email, name, and Google sub ID        |
      | Link Account     | Connect my Google account to the profile      |
    And I should be able to start using the platform immediately

  Scenario: Profile Synchronization
    Given I am signed in
    When I update my Google profile
    And I sign in again
    Then my platform profile should be updated with:
      | Field             | Description                                    |
      | Name             | My updated Google name                        |
      | Profile Picture  | My updated Google profile picture             |
    And existing data and connections should be preserved
