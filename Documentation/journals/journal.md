# Improvements to make

1. Force HTTPS
2. Improve graph visualization to include 3d focus
3. Add images for attributes

## Adding images for attributes

### Background

Currently the image attributes are displayed as solid color circles with labels. This would be much more intuitive if users could see the attributes as images instead.

### Research

1. Find the best image generator for our needs, considering the bulk nature of these requests.
2. Design the best system for maintaining these attributes as a static list to reduce duplication.
3. Design the system for batch API calls to generate the images for the attributes.
  - Basic use can be to generate the batch images call for every new image upload.
  - This must be done with a static list of attributes to avoid duplicate work.
  - The image analysis prompting must be updated to reduce duplication and encourage more connectivity through reuse.

### Pre-requisites

1. Attribute reuse through static lists per attribute type
2. Attribute static lists must have samples included in the image analysis prompting
3. Attribute rules must be specified to enhance connectivity (preference for single words, known terms, etc.)

### Today's task

Today's task is to implement the pre-requesites for attribute reuse and better prompting.