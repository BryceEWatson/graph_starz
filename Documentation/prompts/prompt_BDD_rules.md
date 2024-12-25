# Daily Task: Refine and expand on BDD product features

## Background

We have a @central_index.yml file for BDD features. Our goal is to refine and improve the features list to better match our existing codebase while also creating the referenced feature files reference in the index.

## Task

1. Review each feature in the @central_index.yml file and ensure it aligns with the existing codebase.
2. If a feature is missing or needs refinement, update the index accordingly.
3. If the index looks correct, go deeper and start creating the feature files referenced in the index.

## Guidelines

- Ensure that the features in the index align with the existing codebase, always check the existing code before making assumptions or changes.
- If a feature is missing or needs refinement, update the index accordingly.
- If the index looks correct, go deeper and work on the feature files referenced in the index.
- Take your time and think out loud to ensure your work is accurate and well-aligned with the existing codebase.

---

Let's update the @authentication.feature to include a white list feature that restricts access to the platform to users with emails in our email white list. Non-whitelisted users should be shown a friendly early access message with a link to sign up.

---

# Task: Refine the BDD features to only product features

## Background

We recently created new product, quality, security, value, and workflow feature files from our existing codebase to follow BDD.
However we now see that only the product features are being used and we need to migrate the other features as rules in the @central_index.yml file instead.

## Task

1. Review each feature in the @central_index.yml file and ensure it aligns with our new product-only BDD feature set.
2. Review the @workflow and @quality feature files first then merge the key learnings from them into the @central_index.yml file.

## Guidelines

- The @central_index.yml file will be provided as an initial message for all new developers, so it is important to focus on the developer's perspective when migrating the non-product features into the index as instructions.

---

# Task: Improve the @central_index.yml file

The @central_index.yml file is our central reference for all BDD features and development guidelines. We need to improve it to ensure the instructions explicity instruct the engineer to compare the source code against the BDD feature files to ensure accuracy.