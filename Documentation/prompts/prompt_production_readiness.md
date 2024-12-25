Our task today is to simplify our @production_readiness.feature and the @production_readiness_plan.md to focus on these priorities first:
1. A simple Docker deploy for this next.js application to be deployed to gcloud
2. A production version of @init-db.js with an option to wipe the production db for a fresh copy
3. A clean method for accessing gcloud secrets in production, using the same variable names as those in @.env.example 
4. A production deploy command in package.json that deploys our Docker image to gcloud
5. Proper use of the existing gcloud networking to reuse the existing domain and SSL certificate

Guidelines:
- Review the @developer_rules.md for best practices
- Simplicity is key, the deploy should be repeatable and easy to debug
- Maintain a document that outlines the deployment process in detail

---

# Task: Continue implementation of the @production_readiness.feature

## Background

We recently finished the docker run test work on the @production_readiness.feature to help us deploy our application to production on Google Cloud. Our @production_readiness_plan.md outlines the deployment process, but we need to keep implementing the feature following the guidelines in the @developer_rules.md to keep it simple, effective, and easy to run and use.

## Guidelines

1. Review the @developer_rules.md for best practices
2. Review the @production_readiness.feature and the @production_readiness_plan.md for implementation details.
3. Remember this is a Next.js application and will run in a single Docker container.
4. Keep the @production_readiness.feature and the @deployment_guide.md up to date as the code and scripts change.

## Task Details

Review the @prod-deploy-cloud-run.ps1 script in order to ensure it will fully handle our deployment needs as described in the @production_readiness.feature.

# Task: Fix missing secret value for next.js in production

## Background

After deploying our application to producting using the @prod-deploy-cloud-run.ps1 script, we discovered a missing secret value for NEXTAUTH_SECRET. The production logs show this:
"""
2024-12-21 08:54:06.603 PST
[next-auth][error][NO_SECRET]
2024-12-21 08:54:06.603 PST
https://next-auth.js.org/errors#no_secret Please define a `secret` in production. Error [MissingSecretError]: Please define a `secret` in production.
2024-12-21 08:54:06.603 PST
at t.assertConfig (/app/.next/server/chunks/629.js:1:112445)
2024-12-21 08:54:06.603 PST
at g (/app/.next/server/chunks/629.js:1:105814)
2024-12-21 08:54:06.603 PST
at async a (/app/.next/server/chunks/629.js:25:19771)
2024-12-21 08:54:06.603 PST
at async e.length.t (/app/.next/server/chunks/629.js:25:21261)
2024-12-21 08:54:06.603 PST
at async te.do (/app/node_modules/next/dist/compiled/next-server/app-route.runtime.prod.js:18:17826)
2024-12-21 08:54:06.603 PST
at async te.handle (/app/node_modules/next/dist/compiled/next-server/app-route.runtime.prod.js:18:22492)
2024-12-21 08:54:06.603 PST
at async doRender (/app/node_modules/next/dist/server/base-server.js:1455:42)
2024-12-21 08:54:06.603 PST
at async responseGenerator (/app/node_modules/next/dist/server/base-server.js:1814:28)
2024-12-21 08:54:06.603 PST
at async NextNodeServer.renderToResponseWithComponentsImpl (/app/node_modules/next/dist/server/base-server.js:1824:28) {
2024-12-21 08:54:06.603 PST
code: 'NO_SECRET'
2024-12-21 08:54:06.603 PST
}
"""

## Documentation
secret
Default value: string (SHA hash of the "options" object) in development, no default in production.
Required: Yes, in production!
Description
A random string is used to hash tokens, sign/encrypt cookies and generate cryptographic keys.

If you set NEXTAUTH_SECRET as an environment variable, you don't have to define this option.

If no value is specified in development (and there is no NEXTAUTH_SECRET variable either), it uses a hash for all configuration options, including OAuth Client ID / Secrets for entropy.

danger
Not providing any secret or NEXTAUTH_SECRET will throw an error in production.

tip
If you rely on the default secret generation in development, you might notice JWT decryption errors, since the secret changes whenever you change your configuration. Defining an explicit secret will make this problem go away. We will likely make this option mandatory, even in development, in the future.

## Task details

Review how we are handling the NEXTAUTH_SECRET from gcloud secrets to ensure it is being correctly set as an environment variable in the production deployment. We are running the @prod-deploy-cloud-run.ps1 script to ensure it will deploy to production successfully.

# Task: Fix GCS initialization error in production

## Background

After deploying our application to producting we see that the /api/init call fails in production with the following error in the log:
"""
{"initialized":false,"inProgress":false,"result":null,"error":"GCS initialization failed: undefined","lastInitTime":"2024-12-24T19:25:21.339Z","initStartTime":"2024-12-24T19:25:21.314Z","status":"error","message":"Initialization failed"}
"""

We can also see these errors in the production logs:
"""
DEFAULT 2024-12-24T19:25:21.314188Z 2024-12-24T19:25:21.315Z app:init Initializing GCS...
DEFAULT 2024-12-24T19:25:21.314672Z 2024-12-24T19:25:21.315Z app:init:gcs Starting Firebase Storage initialization check...
DEFAULT 2024-12-24T19:25:21.336697Z 2024-12-24T19:25:21.316Z app:init:gcs Firebase Storage initialization failed: Error: Missing required environment variables: GOOGLE_CLOUD_PROJECT
DEFAULT 2024-12-24T19:25:21.336708Z at x (/app/.next/server/app/api/init/route.js:7:80717)
DEFAULT 2024-12-24T19:25:21.336712Z at _ (/app/.next/server/app/api/init/route.js:7:2985)
DEFAULT 2024-12-24T19:25:21.336715Z at T (/app/.next/server/app/api/init/route.js:7:5128)
DEFAULT 2024-12-24T19:25:21.336719Z at E (/app/.next/server/app/api/init/route.js:7:5799)
DEFAULT 2024-12-24T19:25:21.336722Z at te.do (/app/node_modules/next/dist/compiled/next-server/app-route.runtime.prod.js:18:17855)
DEFAULT 2024-12-24T19:25:21.336725Z at <unknown> (/app/node_modules/next/dist/compiled/next-server/app-route.runtime.prod.js:18:24074)
DEFAULT 2024-12-24T19:25:21.336729Z at <unknown> (/app/node_modules/next/dist/server/lib/trace/tracer.js:171:36)
DEFAULT 2024-12-24T19:25:21.336732Z at NoopContextManager.with (/app/node_modules/next/dist/compiled/@opentelemetry/api/index.js:1:7062)
DEFAULT 2024-12-24T19:25:21.336735Z at ContextAPI.with (/app/node_modules/next/dist/compiled/@opentelemetry/api/index.js:1:518)
DEFAULT 2024-12-24T19:25:21.337491Z 2024-12-24T19:25:21.337Z app:init Initialization failed: Error: GCS initialization failed: undefined
DEFAULT 2024-12-24T19:25:21.337495Z at _ (/app/.next/server/app/api/init/route.js:7:3008)
DEFAULT 2024-12-24T19:25:21.337499Z at async T (/app/.next/server/app/api/init/route.js:7:5122)
DEFAULT 2024-12-24T19:25:21.338246Z 2024-12-24T19:25:21.338Z app:init:api Initialization failed: Error: GCS initialization failed: undefined
DEFAULT 2024-12-24T19:25:21.338249Z at _ (/app/.next/server/app/api/init/route.js:7:3008)
DEFAULT 2024-12-24T19:25:21.338252Z at async T (/app/.next/server/app/api/init/route.js:7:5122)

"""

## Task details

Start by reviewing the @developer_rules.md for best practices.
Then read the @gcsInit.js file to see how we are handling the GCS initialization process.
Finally, brainstorm how we can fix the GCS initialization error in production and proceed with the best possible solution.

As per the developer rules, please ask any research questions you think may help before we continue, if you have any.
