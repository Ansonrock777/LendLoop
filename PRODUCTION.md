# Taking LendLoop to production

What I would change before real neighbours used this, and how it could map onto AWS.

**Honesty first:** I have not run AWS in production. The AWS section below is a design based on how each service is documented to work, written to show my reasoning, not hands-on experience (DOCUMENTATION.md D9). The rest of this note is things I'd do on any platform.

---

## 1. Changes on any platform

### Accounts and sign-in
- Move Clerk to a **production instance** with our own domain. The `+clerk_test` / `424242` sign-ins stop working there, which is what we want.
- Keep the 5-minute JWT lifetime and the exact `"admin"` role check. Add a second admin so one person isn't a single point of failure, and review the admin list monthly.
- Turn on Clerk's bot protection and rate limits for sign-up.

### Data
- Use a separate Convex **production deployment**. Never point dev seed functions at it. `seed:run` already refuses to run twice; in production I'd remove the seed module entirely.
- Write a retention rule and stick to it. For example: delete loans 12 months after they finish, keep audit rows for 24 months, delete n8n failure reports after 90 days. Add a "delete my account" flow that removes or anonymises the user's tools and loans.
- Set up backups, and test restoring one before launch.
- Under UK GDPR the email shown after approval is personal data shared for a clear purpose (arranging pickup). Say so in a short privacy notice. I'd also replace the shown email with in-app messages or a relay address, so nobody's real address is shared at all.

### Automations and email
- Send email from a **transactional email service with our own verified domain** (SPF, DKIM, DMARC), not a personal Gmail account. That gives deliverability, bounce handling and no daily send cap.
- Handle bounces. A hard bounce should mark the address as bad and show a calm prompt to the user, rather than retrying forever.
- Use **one secret per direction** (Convex → n8n and n8n → Convex), stored in a secret manager and **rotated** on a schedule. The verifier can accept the old and new secret for a short overlap, so rotation needs no downtime.
- Keep n8n's "don't save successful runs" setting. Alert someone (email or chat) when the error workflow fires, not only the admin page.

### Web app
- Tighten the CSP. Either turn off Partial Prerendering and use per-request nonces, or try Next.js's subresource-integrity option, to remove `'unsafe-inline'` for scripts.
- Replace the simple counters with a sliding-window rate limiter (Convex has a rate-limiter component), and add limits per IP at the edge.
- Use the user's own time zone for "overdue" instead of UTC days.
- Add monitoring: error tracking for the web app, Convex function error alerts, and an uptime check on the n8n webhook.

### Process
- CI that runs lint, typecheck, tests and build on every pull request, plus a secret scan and dependency audit.
- An external security review or penetration test before launch.
- A short incident runbook: rotate the secret, disable the webhook, how to tell affected users.

---

## 2. How the parts could map onto AWS (design, not experience)

| Part today | On AWS | Why this choice |
| --- | --- | --- |
| Next.js app (local / any host) | **AWS Amplify Hosting** (supports Next.js SSR), or a container on **ECS Fargate** behind an **Application Load Balancer** with **CloudFront** in front | Amplify is the least to operate. Fargate gives more control if we outgrow it. |
| Convex (managed database + functions) | Keep **managed Convex** (it isn't an AWS product). If everything had to be inside AWS: Convex's open-source self-hosted backend on **ECS Fargate** with **RDS for PostgreSQL** as its database | Rewriting the backend for DynamoDB + Lambda would throw away the tested access rules. Self-hosting keeps the code identical. |
| n8n Cloud | Self-hosted n8n on **ECS Fargate**, with **RDS PostgreSQL** for its data, behind an ALB with only the webhook path public | Keeps the workflows as they are. The editor stays private, reachable only through a VPN or an IP allow-list. |
| Daily reminder trigger | n8n's own schedule, or **EventBridge Scheduler** calling the workflow | Either works. EventBridge would make the schedule visible in the same place as the rest of the infrastructure. |
| Gmail | **Amazon SES** with a verified domain (SPF, DKIM, DMARC), moved out of the sandbox | Proper sending service, bounce and complaint notifications through SNS. |
| Secrets (Convex env, n8n credentials) | **AWS Secrets Manager** with rotation; tasks read secrets at start-up through IAM roles | No secrets in task definitions or images; rotation on a schedule. |
| Clerk | Keep **Clerk**, or **Amazon Cognito** if everything had to be AWS | Clerk already does email codes and Google sign-in well; switching would mean re-testing the token claims. |
| Edge protection | **AWS WAF** on CloudFront (managed rule sets, rate-based rules) | Blocks obvious abuse before it reaches the app. |
| Logs and alerts | **CloudWatch** logs, metrics and alarms (error rate, failed automations, 5xx on the webhook) | One place to look; alarms go to the on-call person. |
| Network | Private subnets for Fargate tasks and RDS; only the load balancer is public; security groups allow only the paths needed | Smallest possible public surface. |
| Infrastructure as code | **AWS CDK** or Terraform | Repeatable environments (staging and production) and reviewable changes. |

### Where I'd need to learn on the job
- Running RDS well: parameter tuning, failover, and backup restore drills.
- Making IAM least-privilege policies tight without breaking deploys.
- Choosing between Amplify and Fargate once real traffic patterns are known.

I'd want a colleague's review on these before calling the setup production-ready.
