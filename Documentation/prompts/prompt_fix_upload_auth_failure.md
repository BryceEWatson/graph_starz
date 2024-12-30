# Task: Fix the upload flow to accept signed in users

## Background

The /api/images/upload endpoint is used to upload images to the application. However, we see a 401 Unauthorized error when trying to upload images while signed in:
"""
C:\Users\Bryce\Documents\Projects\graph_starz\src\components\UploadButton.js:38 
        
        
       POST http://localhost:3000/api/images/upload 401 (Unauthorized)
handleFileSelect @ C:\Users\Bryce\Documents\Projects\graph_starz\src\components\UploadButton.js:38
processDispatchQueue @ react-dom-client.development.js:16033
eval @ react-dom-client.development.js:16636
batchedUpdates$1 @ react-dom-client.development.js:3103
dispatchEventForPluginEventSystem @ react-dom-client.development.js:16192
dispatchEvent @ react-dom-client.development.js:20264
dispatchDiscreteEvent @ react-dom-client.development.js:20232Understand this errorAI
C:\Users\Bryce\Documents\Projects\graph_starz\src\components\UploadButton.js:85 Upload error: Error: Upload failed: Unauthorized
    at captureStackTrace (capture-stack-trace.js:13:23)
    at console.error (intercept-console-error.js:51:62)
    at handleFileSelect (C:\Users\Bryce\Documents\Projects\graph_starz\src\components\UploadButton.js:85:21)
"""

There are no errors in the backend logs when this happens. The user is in a signed in state and we already see the graph has loaded properly.

Note that the @UploadButton.js exists here.

## Task details

