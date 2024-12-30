Feature: User Authentication
    As a user
    I want to securely sign in to Graph Starz
    So that I can access the platform features

    Implementation:
        Authentication: src/app/api/auth/[...nextauth]/options.js
        User Repository: src/lib/neo4j/userRepository.js
        Whitelist API: src/app/api/auth/whitelist/route.js
        Main UI: src/app/page.js
        Early Access: src/app/early-access/page.js

    Background:
        Given the application is running
        And the authentication system is configured with Google OAuth

    @implemented @file:src/app/api/auth/[...nextauth]/options.js @file:src/components/Navbar.js
    Scenario: User signs in with Google
        When a user clicks "Sign in with Google"
        Then they should be redirected to Google's authentication page
        And after successful authentication, they should return to Graph Starz
        And no Neo4j user record should be created automatically

    @implemented @file:src/app/api/auth/[...nextauth]/options.js
    Scenario: Session persistence
        Given a user is signed in
        When they refresh the page
        Then they should remain signed in
        And their session information should be preserved

    @implemented @file:src/app/page.js @file:src/app/api/auth/whitelist/route.js
    Scenario: New user requests early access
        Given a user is not signed in
        When they visit the homepage
        Then they should see:
            | Element                | Implementation                |
            | Welcome message       | page.js welcome section       |
            | Sign-in button       | Navbar.js sign in button      |
        When they sign in with Google for the first time
        Then they should see:
            | Element                | Implementation                |
            | Early access info     | page.js early access section |
            | Request button        | page.js request button       |
        When they click "Request Early Access"
        Then a new user record should be created in Neo4j with:
            | Field           | Value                | Implementation               |
            | id             | Google profile ID    | userRepository.createUser   |
            | name           | Google display name  | userRepository.createUser   |
            | email          | Google email        | userRepository.createUser   |
            | image          | Google avatar URL   | userRepository.createUser   |
            | isWhitelisted  | false              | userRepository.createUser   |
        And they should see a pending status message

    @implemented @file:src/app/page.js @file:src/lib/neo4j/userRepository.js
    Scenario: User with pending whitelist request
        Given a user has previously requested early access
        When they sign in with Google
        Then they should see:
            | Element                | Implementation                |
            | Early access info     | page.js early access section |
            | Pending status        | page.js status section       |
        And the Upload button should be hidden
        And they should not be able to access protected features

    @implemented @file:src/components/Navbar.js @file:src/lib/neo4j/userRepository.js
    Scenario: Whitelisted user accesses platform
        Given a user is whitelisted
        When they sign in with Google
        Then they should:
            | Action                 | Implementation                |
            | See Upload button     | Navbar.js                    |
            | Access graph view     | page.js                      |
            | Access all features   | Protected by isWhitelisted   |
        And they should not see any early access messages

    @implemented @file:src/lib/neo4j/userRepository.js
    Scenario: Admin whitelist management
        Given an admin needs to manage whitelist requests
        Then they can use these Neo4j queries:
        """
        # List users waiting for access
        # Shows newest users first
        MATCH (u:User)
        WHERE u.isWhitelisted = false
        RETURN u.name, u.email, u.createdAt
        ORDER BY u.createdAt DESC;

        # View all users with their access status
        # Shows newest users first
        MATCH (u:User)
        RETURN u.name, u.email, 
               CASE 
                 WHEN u.isWhitelisted = true THEN 'Has Access'
                 ELSE 'Waiting for Access'
               END as status,
               u.createdAt
        ORDER BY u.createdAt DESC;

        # Grant access to a user
        MATCH (u:User {email: 'user@example.com'})
        SET u.isWhitelisted = true
        RETURN u.name, u.email, u.isWhitelisted;
        """
