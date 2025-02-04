# Quick Context
The Upload Flow is a critical system component that handles image ingestion, processing, and storage. It follows a checkpoint-based system to ensure reliable uploads, with real-time status tracking and comprehensive error handling. The flow integrates with AI services for attribute generation and relationship mapping, creating a rich graph of image relationships.

# Upload Flow Specification

## Core Principles
- Live-updating checkpoints with real-time feedback
- Clear status tracking through graph state
- Immediate error detection and resolution
- Persistent upload history in graph database
- Two-stage upload process managed via graph nodes
- Collapsible upload records for efficient space usage

## Status Update System
All checkpoints use a unified status update system:
- Real-time updates via WebSocket connection for checkpoint progress
- Event types:
  ```typescript
  interface StatusEvent {
    checkpoint: 'validation' | 'processing' | 'analysis' | 'storage' | 'publishing';
    status: 'waiting' | 'in_progress' | 'complete' | 'error';
    progress: number;  // Overall progress 0-100
    currentOperation?: {
      name: string;    // Operation description
      progress: number; // Operation-specific progress
      message?: string; // Optional status message
    }
  }
  ```

## Upload Flow Checkpoints

### Checkpoint 1: Record Creation & File Selection
Requirements:
- Create upload record node in graph database
- Initialize node with file metadata and unpublished state
- Validate file format and size before upload begins
- Provide immediate feedback on file validity
- Ensure user is authenticated

User Experience:
- Collapsible upload record appears instantly
- Large drop zone with clear format/size limits
- Instant feedback on file validity
- Clear error messages if invalid
- Size and format details display
- Expand/collapse controls for record management

Status Messages:
```typescript
// Example status events
{
  checkpoint: 'validation',
  status: 'in_progress',
  progress: 25,
  currentOperation: {
    name: 'Creating upload record',
    progress: 50,
    message: 'Validating file format...'
  }
}
{
  checkpoint: 'validation',
  status: 'in_progress',
  progress: 50,
  currentOperation: {
    name: 'Checking file size',
    progress: 75,
    message: 'Checking file size...'
  }
}
{
  checkpoint: 'validation',
  status: 'complete',
  progress: 100,
  currentOperation: {
    name: 'Validation complete',
    progress: 100,
    message: 'File accepted'
  }
}
```

### Checkpoint 2: Image Processing

#### Requirements
- Convert images to web-optimized format [📖](../Technical/NextJS.md#image-optimization-with-nextimage)
- Generate appropriate size variants (downscale only, never upscale):
  - Original: Preserve original dimensions and quality
  - Medium: 1200px on longest side
  - Small: 600px on longest side
- Maintain aspect ratio for all variants
- Skip variant generation if original is smaller than target size
- Calculate image fingerprint for duplicate detection
  - Uses perceptual hash (pHash) with 90% similarity threshold
- Never upscale images to larger dimensions

For detailed processing parameters and quality settings, see [UploadPipeline.md](../Technical/Processing/UploadPipeline.md#2-image-processing-layer).

User Experience:
- Processing progress bar [📖](../Technical/Frontend/Components/ProcessingPreview.md#progress-indicators)
- Preview of each variant as it's generated
- Size reduction statistics
- Size variant previews
- Duplicate detection warnings
- Clear progress indicators

Status Messages:
```typescript
// Example status events
{
  checkpoint: 'processing',
  status: 'in_progress',
  progress: 25,
  currentOperation: {
    name: 'Converting image format',
    progress: 50,
    message: 'Converting image format...'
  }
}
{
  checkpoint: 'processing',
  status: 'in_progress',
  progress: 50,
  currentOperation: {
    name: 'Generating size variants',
    progress: 75,
    message: 'Creating medium variant...'
  }
}
{
  checkpoint: 'processing',
  status: 'complete',
  progress: 100,
  currentOperation: {
    name: 'Processing complete',
    progress: 100,
    message: 'Processing complete'
  }
}
```

### Checkpoint 3: AI Analysis
Requirements:
- Analyze image content [📖](../Technical/Processing/UploadPipeline.md#3-ai-analysis-layer)
- Generate descriptive attributes [📖](../Technical/Frontend/Components/AttributeDisplay.md#attribute-management)
- Map relationships to existing content
- Create natural language description

User Experience:
- Display detected attributes with confidence [📖](../Technical/Frontend/Components/AttributeDisplay.md#confidence-visualization)
- Preview generated title and description
- Simple attribute list by category
- Option to adjust or override AI suggestions

Status Messages:
```typescript
// Example status events
{
  checkpoint: 'analysis',
  status: 'in_progress',
  progress: 25,
  currentOperation: {
    name: 'Analyzing image content',
    progress: 50,
    message: 'Detecting attributes...'
  }
}
{
  checkpoint: 'analysis',
  status: 'in_progress',
  progress: 50,
  currentOperation: {
    name: 'Generating descriptions',
    progress: 75,
    message: 'Generating title and description...'
  }
}
{
  checkpoint: 'analysis',
  status: 'complete',
  progress: 100,
  currentOperation: {
    name: 'Analysis complete',
    progress: 100,
    message: 'Analysis complete'
  }
}
```

### Checkpoint 4: Storage & Processing Completion
Requirements:
- Update graph node with processed image data
- Set node state to ready-for-publishing
- Prepare graph relationships
- Enable publishing action
- Validate processing results

User Experience:
- Upload progress indicator
- Preview availability status
- Processing confirmation
- "Publish" button activation
- Clear unpublished status
- Preview of final results

Status Messages:
```typescript
// Example status events
{
  checkpoint: 'storage',
  status: 'in_progress',
  progress: 25,
  currentOperation: {
    name: 'Finalizing storage',
    progress: 50,
    message: 'Finalizing storage...'
  }
}
{
  checkpoint: 'storage',
  status: 'complete',
  progress: 100,
  currentOperation: {
    name: 'Storage complete',
    progress: 100,
    message: 'Ready to publish'
  }
}
```

### Checkpoint 5: Publishing
Requirements:
- Validate user has publish permissions
- Verify all required attributes are present
- Create permanent graph relationships
- Update node visibility settings
- Generate permanent access URLs
- Record publication timestamp
- Update search indices

User Experience:
- Publish button with clear action
- Final confirmation dialog
- Publication success message
- Option to view published image
- Links to share image
- Clear published status indicator

Status Messages:
```typescript
// Example status events
{
  checkpoint: 'publishing',
  status: 'in_progress',
  progress: 25,
  currentOperation: {
    name: 'Verifying publication requirements',
    progress: 50,
    message: 'Verifying publication requirements...'
  }
}
{
  checkpoint: 'publishing',
  status: 'complete',
  progress: 100,
  currentOperation: {
    name: 'Publication complete',
    progress: 100,
    message: 'Published successfully!'
  }
}
```

## Error Handling & Recovery

### Record Controls
- Each upload record has a cancel button ("X")
- Cancel button stops the current checkpoint operation
- Canceled operations can be retried via retry button
- Upload record remains until explicitly removed by user

### Retry Capabilities
Each checkpoint has specific retry behavior:

#### Checkpoint 1: Record Creation & File Selection
- No retry - User must reselect file if validation fails
- Immediate feedback on validation errors
- See [UploadPipeline.md](../Technical/Processing/UploadPipeline.md#1-validation-layer) for validation details

#### Checkpoint 2: Image Processing
- Manual retry via retry button
- User can cancel processing at any time
- Processing resumes from start of checkpoint
- See [UploadPipeline.md](../Technical/Processing/UploadPipeline.md#2-image-processing-layer) for processing error details

#### Checkpoint 3: AI Analysis
- Manual retry via retry button
- User can cancel analysis at any time
- Analysis resumes from start of checkpoint
- See [UploadPipeline.md](../Technical/Processing/UploadPipeline.md#3-ai-analysis-layer) for analysis error handling

#### Checkpoint 4: Storage
- Manual retry via retry button
- User can cancel storage operation at any time
- Storage resumes from start of checkpoint
- See [UploadPipeline.md](../Technical/Processing/UploadPipeline.md#4-storage-layer) for storage error scenarios

#### Checkpoint 5: Publishing
- Manual retry via retry button
- User can cancel publishing at any time
- Publishing resumes from start of checkpoint
- See [Endpoints.md](../Technical/API/Endpoints.md#upload-flow-endpoints) for API error handling

### Error Recovery UI
- Clear error messages with retry button
- Cancel button ("X") for stopping current operation
- Manual retry button when operation fails
- Option to remove upload record entirely
- Detailed error logging for support

## Related Components

### Graph Schema Extensions
- Upload Record Node Type:
  - Basic Properties:
    - uploadId: unique identifier
    - fileName: original file name
    - fileSize: in bytes
    - uploadStartTime: timestamp
    - userId: reference to uploader
  - Processing Properties:
    - currentState: INITIALIZING | PROCESSING | READY_TO_PUBLISH | PUBLISHED | ERROR
    - processingProgress: percentage
    - errorDetails: if any
  - Publication Properties:
    - isPublished: boolean
    - publishedAt: timestamp
    - publishedBy: user reference
    - visibility: public | private
  - Relationships:
    - UPLOADED_BY -> User
    - HAS_VERSION -> ImageVariant
    - RELATED_TO -> Image
    - TAGGED_WITH -> Attribute

### State Tracking
Each upload node maintains a timeline of its progression:
```
Example Timeline:
10:00:00 AM - INITIALIZING - Upload started
10:00:05 AM - PROCESSING - File validation complete
10:00:30 AM - PROCESSING - Image optimization (45%)
10:01:00 AM - PROCESSING - AI analysis complete
10:01:30 AM - READY_TO_PUBLISH - All processing complete
10:05:00 AM - PUBLISHED - Made public by user
```

This timeline helps with:
- Debugging upload issues
- Measuring processing performance
- Identifying bottlenecks
- Auditing publication history
- Supporting user inquiries

### Upstream Dependencies
- Authentication System [📖](../Technical/Authentication.md#integration-with-features)
- File Processing Pipeline [📖](../Technical/Processing/UploadPipeline.md)
- Database Schema [📖](../Technical/Backend/DatabaseSchema.md)

### Downstream Dependencies
- Browse Flow [📖](./BrowseFlow.md)
- Search System
- User Profiles

## Flow Requirements

### Performance Goals
- Maximum upload size: 20MB
- Responsive UI throughout process
- Instant record creation
- Efficient record management

### Security Requirements
- Authenticated uploads only
- File type validation
- Content verification
- Proper access controls
- Rate limiting protection
- Graph node access control

### User Feedback
Status Log Display:
- Persistent collapsible records
- Expandable details for each step
- Status indicators from graph state:
  - [WAIT] Waiting
  - [>] In Progress
  - [OK] Complete
  - [!] Needs Attention
  - [TEMP] Unpublished
  - [PUB] Published
- Time stamps for all updates
- Error messages and solutions
- Clear publish/unpublish state

### Record Management
- Collapsible sections for space efficiency
- Graph-based storage of all upload records
- State management through graph properties
- Historical record access via graph traversal
- Upload statistics and metrics from graph data