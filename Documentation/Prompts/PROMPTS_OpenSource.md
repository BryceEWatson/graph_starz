# Prompt: Codebase cleanup for open source release

Today I'd like you to start by searching the codebase for any security risks or sensitive information that should be removed before the project is made open source.

A few initial concerns:
1. Sensitive information may be exposed in the @scripts folder, specifically the @prod-deploy-cloud-run.ps1 script, and others.
2. @Prompts folder may contain sensitive information in the prompts
3. Other unexpected files may contain sensitive information

Please take your time to thoroughly review the codebase and identify any potential security risks or sensitive information that should be removed before the project is made open source.