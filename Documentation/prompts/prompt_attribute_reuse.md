
# Task: Review image analysis prompting for attribute reuse

## Background

Our image analysis in @imageAnalyzer.js .js contains prompting logic that requests image metadata from the Anthropic API. This prompting logic is used to extract relevant attributes from the image, such as title, description, visual style, objects, colors, and mood. This is working but we would like to review the effectiveness of the prompting logic considering our @product_vision.md .md document.

## Task details

Our priorities are as follows:
1. Review the @product_vision.md .md critically, looking for any improvements we can make to our analysis goals at the highest levels in the design.
2. Brainstorm potential improvements to our product vision around image analysis and prompting. 
3. Review the @imageAnalyzer.js r.js file to identify any opportunities for improvement.

## Notes

- No confidence scores for now.
- Focus on providing user value and usability
- Focus on improving prompting to improve attribute consistency
- Images are never directly connected, they are connected through attributes only.
- Hierarchical relationships would be useful but we are not sure how to display them in the graph view.
