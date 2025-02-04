# PROMPT: Upload documentation accuracy to codebase

Today I'd like you to start by fully reading (all lines) of these documents, in order:
1. @index.yml
2. @image_upload.feature
3. @UploadModal.js
4. @UploadButton.js
5. @upload/route.js

Then reiterate the current requirements for the upload feature in order to compare against the actual implementation in the codebase. Our goal is to ensure coherency and alignment between documentation and code, which should be interlinked and consistent.

Please take your time and think out loud as you work through this.

# PROMPT: Analyze new upload page feature against existing implementation

Today I'd like you to start by fully reading (all lines) of these documents, in order:
1. @index.yml 
2. @image_upload.feature 
3. @UploadModal.js 
4. @UploadButton.js 
5. @route.js 

Then reiterate the current implementation so that we can compare and contrast with the this new feature proposal we have in @UploadPage.md.

Our goal is to identify the work needed to build this new upload page while working within the constraints of the existing codebase.

Please take your time and look up additional code files as needed to thoroughly complete this task.

---

Let's spend more time evaluating the current implementation to ensure we identify all reuse opportunities for this new feature.

Please fully read:
1. @userRepository.js
2. @imageRepository.js (365 lines)
3. @imageAnalyzer.js (302 lines)
4. @imageProcessor.js
5. @gcs.js (347 lines)

Then reevaluate the differences between the current implementation and the new feature proposal, and identify any potential reuse opportunities.

---

A few comments/questions:
1. While the @imageProcessor.js does cover the functionality we need, does it have any way to communicate back the results of each step to the user? In the new feature it is requested that we use Websockets to do this.
2. Let's leave out the confidence scores for now.
3. Can you break down exactly what the new attribute categories are and how they would align with our existing schema in @imageRepository.js?
4. Please elaborate on how we would add "Support for unpublished state"? In the new @UploadPage.md we use a visibility attribute in the nodes, which can take the values "public" or "private". Can we use this?


Overall it would be great to have more details on exactly how these features would be implemented, following our BDD principles,without replacing the existing documentation. To accomplish this, please create a new image_upload_new.feature and image_upload_new.specification file.

Please take your time and think out loud as you work through all of this. Remember to follow our BDD principles when writing these new files!

---

A few comments:
1. I don't see any mention of how the upload page displays the upload history, by containing each upload record within a collapsible section. Please check the @UploadPage.md file again and look for the visual layout of the page so that we can make sure its clear in the new documentation as well.
2. It would be helpful to have a complete visual flow described somewhere in the documentation, as much as BDD can suppport it.
3. Following BDD, I don't think our specification files should have code. Instead they should clearly describe the expected behavior of the feature. Implementation details can and should be provided, but not in the form of code.

Please take your time and think out loud as you work through these comments.

---

I have a new comments:
1. Let's remove the retry button from the upload record detail.
2. This makes me think we will need to update our db schema: "Store Metadata   | Save file size and name". Please review @imageRepository.js fully to see the schema being used.
3. In @imageRepository.js we can see the relationship between the image and user nodes is "UPLOADED" not "UPLOADED_BY", so we should follow the same "UPLOADED" to reduce complexity.
4. Please double check the image sizes and the image size names against the actual code in @imageProcessor.js.
5. This section should be rephrased: "Make image visible in public searches " to updating the visibility of the image node to public.
6. Please take a moment and reevaluate our @image_upload_new.specification details against all of our changes so far.

Please take your time and think out loud as you work through these comments.

---

I notice you didn't read the entire @imageRepository.js file, it has 364 lines.