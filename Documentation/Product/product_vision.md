# Product Vision

## The Problem
Image sharing platforms today are not well equipped to deal with the increasing volume of AI-generated images. Lacking a good visual way to browse through large numbers of related images is a major missing feature from platforms such as deviantart. Today these platforms rely on pre-made algorithms and user feeds to surface new content to users, but this is not enough to help users find the images they are looking for.

## The Solution
Graph starz solves this problem by creating a graph-based image upload and sharing platform that leverages AI understanding to create a coherent global graph of interconnected images and the users who upload and share them. Leveraging AI understanding allows the graph to built from the identified attributes of the images, which can be widely configured using prompting with modern LLM AI models.

## Data Structure
- **Root Node**: A single root node serves as the entry point to the graph database.
- **Users**: Connected directly to the root node via `CONNECTED_TO` relationships, representing platform users.
- **Images**: Connected to users via `UPLOADED` relationships, tracking image ownership.
- **Attributes**: Connected to images via `HAS_ATTRIBUTE` relationships, representing various characteristics:
  - Style (e.g., impressionist, modern)
  - Color (e.g., blue, green)
  - Mood (e.g., peaceful, energetic)
  - Composition (e.g., rule of thirds)
  - Technique (e.g., oil painting)
  - Objects (e.g., tree, mountain)

### Node Properties
- **Root**: `id`
- **User**: `userId`, `createdAt`, `lastLogin`
- **Image**: `imageId`, `uploadedAt`, `url`, `status`
- **Attribute**: `attributeId`, `type`, `value`

## Features
- **Image Upload**: Users can upload images to the platform and have advanced AI identify relevant attributes for each image.
- **Graph View**: The main browse view of graph starz is a graph view that allows users to view the connections between images, users, and attributes in a dynamic and interactive way.
- **AI Management**: The platform relies on advanced AI models to identify relevant attributes for each image. This differs from most platforms today that depend on user-defined tags and keywords. By relying on AI models for attribute identification, the users will benefit from a more accurate and relevant graph of images.
- **Google Authentication**: The platform uses Google authentication to ensure that users can access their data and interact with the platform.

## Technologies
- **Neo4j**: The platform uses Neo4j as the underlying graph database to store and manage the image data.
- **Node.js**: The platform uses Node.js as the backend server for the platform.
- **React**: The platform uses React as the frontend framework for the platform.
- **Tailwind**: The platform uses Tailwind as the CSS framework for the platform.
- **GCS**: The platform uses Google Cloud Storage as the storage service for the platform.
- **Google Cloud Platform**: Used for deploying the platform in production and handling oauth authentication.
- **Docker**: Used for building and running the platform in local andproduction.
- **Kubernetes**: Used for deploying the platform in local and production.
