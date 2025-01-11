# Task: Enhance Graph Starz with an HTML View (Path-Based)

## Background

Currently, our application primarily uses a graph view. We're expanding its capabilities by adding an integrated HTML view, which will be an alternative to the graph view in some cases. This new view will need to co-exist with the existing functionality where a modal is loaded inside the graph view when showing details.

## Goal

Our goal is to provide users with a more flexible viewing experience, offering both the dynamic graph visualization and a simpler, lightweight HTML representation for specific content. This allows us to potentially cater to a wider range of devices and use cases.

## Requirements

1.  **View Navigation:**
    *   Each HTML page should be accessible from the graph view, and vice-versa. Consider how we can enable seamless transitions between the two, and how navigation back to the graph will open the detail modal if the same `image/<id>` is present in the URL.

2.  **URL Structure:**
    *   Each HTML page should have a corresponding URL, using a `/html` path segment to specify whether to load the pure HTML view or the graph view.

3.  **URL Formats:** The application must support the following URL patterns:
    *   `<domain>/` -  Loads the default graph view centered on the current user's node.
    *   `<domain>/html` - Loads the default HTML view, which should display the current user details.
    *   `<domain>/image/<id>` - Loads the graph view, centered on the image node with the details modal open.
    *   `<domain>/image/<id>/html` - Loads the pure HTML view for the image details, bypassing the graph view entirely.

4.  **View Handling:**
    *   When the HTML view is loaded (using `/html` path segment), the graph should **not** be loaded. Only the pure HTML content should be displayed.
    *   When the graph view is loaded, the inline details modal should be opened if an `image/<id>` parameter is present in the URL. Ensure the modal opens with the correct information.

5.  **Error Handling:** How should the system behave when an invalid image ID or other URL parameter is provided? What happens if the `/html` endpoint is accessed without any user context, and what happens if a `image/<id>` path is provided in the `/html` endpoint without any user context? Implement proper error messaging for each case.

## Task Details

1.  **Code Analysis:** Carefully examine the existing code base, focusing specifically on:
    *   **Routing Logic in `route.js`:** Detail how the existing routes are structured, how URL parameters are currently handled, and any potential conflicts with the new `/html` routing. Pay particular attention to how to properly extract the `image/<id>` parameter when present in the URL.
    *   **Modal Interaction in `setupGraph.js` and `useD3Graph.js`:** Deeply analyze how the details modal is triggered, loaded, and displayed, and how the data for it is handled. Explain how the data is passed to the modal. Consider how this logic will need to be adapted to work with the new HTML view.
    *   **Data Loading:** Examine how data is fetched and loaded for the graph and the modal, and what existing logic can be reused for the new HTML views, including how the data for user details is handled.
    *   **Refactoring Opportunities:** Identify specific areas of the code that will need refactoring and outline how this refactoring will be accomplished.
    (Review files: `@src/lib/d3`, `@setupGraph.js`, `@route.js` )

2. **BDD Feature:** Create a new BDD feature document in `@product` outlining the requirements and tasks for adding the HTML view, ensuring it includes specific implementation details. **Provide the contents of the BDD document.**

3. **Feature Review:** Review your feature document, ensuring it thoroughly addresses the requirements and implementation tasks, while also considering:
    *   Performance implications.
    *   Maintainability and testability.
    *   Potential for future extensibility.

4.  **Think Out Loud:** As you analyze the code and plan the implementation, share your thought process. Be specific about:
    *   Your reasoning for selecting particular approaches for routing, view creation, and data loading.
    *   Any uncertainties or potential challenges you anticipate, including error handling scenarios.
    *   The pros and cons of different options you considered, including alternative approaches to reuse or refactor existing code.
    *   How you plan to create tests first, before implementing any functionality, as stated by the "Test First" principle.

Let's collaborate closely on this feature. Please let me know if you have any initial questions.