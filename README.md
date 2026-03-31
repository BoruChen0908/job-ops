# JobOps Fork (BoruChen0908)

> Forked from [DaKheera47/job-ops](https://github.com/DaKheera47/job-ops) — a self-hosted, Docker-based job search pipeline.

This fork extends job-ops with features for US internship hunting: a new job source, LLM-powered search term discovery, extractor-level dedup, and multi-user Docker support.

## Fork Features

| Feature | Description |
|---------|-------------|
| **SimplifyJobs Extractor** | Fetches intern/new-grad listings from SimplifyJobs GitHub repos (Summer2026-Internships + New-Grad-Positions) |
| **Dynamic Term Expansion** | After scoring, LLM analyzes top JDs to discover new search terms. Shown as accept/dismiss chips in the Run Pipeline dialog. Accepted terms auto-merge into next run's search queries. |
| **Extractor-Level Dedup** | All extractors skip already-known job URLs before returning results, so per-term budget is spent on genuinely new listings |
| **Multi-User Instances** | Separate Docker Compose files with bind-mount data isolation per user (e.g. `docker-compose.katherine.yml`) |

## Quick Start

```bash
git clone https://github.com/BoruChen0908/job-ops.git
cd job-ops
cp .env.example .env   # Edit with your LLM API key and RxResume credentials
docker compose up -d
# Open http://localhost:3005
```

### Running a second instance (for another user)

```bash
docker compose -f docker-compose.katherine.yml up -d
# Open http://localhost:3006
```

Each instance has its own SQLite database, settings, and pipeline state.

## Pipeline Flow

```
discover (extractors) -> import (SQLite) -> score (LLM) -> extract terms (LLM) -> select (topN) -> tailor (LLM) -> PDF (RxResume)
```

## Upstream Features

Everything from the original job-ops still works:

## 40s Demo: Crawl -> Score -> PDF -> Track

<details>
<summary>
Pipeline Demo
</summary>
  
  https://github.com/user-attachments/assets/5b9157a9-13b0-4ec6-9bd2-a39dbc2b11c5
</details>


<details>
<summary>
Apply & Track
</summary>
  
  https://github.com/user-attachments/assets/06e5e782-47f5-42d0-8b28-b89102d7ea1b
</details>

## Documentation (Start Here)

JobOps ships with full docs for setup, architecture, extractors, and troubleshooting.

If you want the serious view of the project, start here:

- [Documentation Home](https://jobops.dakheera47.com/docs/)
- [Self-Hosting Guide](https://jobops.dakheera47.com/docs/getting-started/self-hosting)
- [Feature Overview](https://jobops.dakheera47.com/docs/features/overview)
- [Orchestrator Pipeline](https://jobops.dakheera47.com/docs/features/orchestrator)
- [Extractor System](https://jobops.dakheera47.com/docs/extractors/overview)
- [Troubleshooting](https://jobops.dakheera47.com/docs/troubleshooting/common-problems)

## Quick Start (10 Min)

Prefer guided setup? Follow the [Self-Hosting Guide](https://jobops.dakheera47.com/docs/getting-started/self-hosting).

```bash
# 1. Download
git clone https://github.com/DaKheera47/job-ops.git
cd job-ops

# 2. Start (Pulls pre-built image)
docker compose up -d

# 3. Launch Dashboard
# Open http://localhost:3005 to start the onboarding wizard

```

## Why JobOps?

* **Universal Scraping**: Supports **LinkedIn, Indeed, Glassdoor, Adzuna, Hiring Cafe, startup.jobs, Working Nomads, Gradcracker, UK Visa Jobs**.
* **AI Scoring**: Ranks jobs by fit against *your* profile using your preferred LLM (OpenAI, OpenRouter, `openai-compatible` endpoints such as LM Studio/Ollama, Gemini).
* **Auto-Tailoring**: Generates custom resumes (PDFs) for every application using RxResume v4.
* **Email Tracking**: Connect Gmail to auto-detect interviews, offers, and rejections.
* **Self-Hosted**: Your data stays with you. SQLite database. No SaaS fees.

## Workflow

1. **Search**: Scrapes job boards for roles matching your criteria.
2. **Score**: AI ranks jobs (0-100) based on your resume/profile.
3. **Tailor**: Generates a custom resume summary & keyword optimization for top matches.
4. **Export**: Uses [RxResume v4](https://v4.rxresu.me) to create tailored PDFs.
5. **Track**: "Smart Router" AI watches your inbox for recruiter replies.

## Supported Extractors

| Platform | Focus |
| --- | --- |
| **LinkedIn** | Global / General |
| **Indeed** | Global / General |
| **Glassdoor** | Global / General |
| **Adzuna** | Multi-country API source |
| **Hiring Cafe** | Global / General |
| **startup.jobs** | Startup-focused remote roles |
| **Working Nomads** | Remote-only curated jobs |
| **Gradcracker** | STEM / Grads (UK) |
| **UK Visa Jobs** | Sponsorship (UK) |
| **SimplifyJobs** | US Internships / New Grad (fork) |

*(More extractors can be added via TypeScript - see [extractors documentation](https://jobops.dakheera47.com/docs/extractors/overview))*

## Post-App Tracking (Killer Feature)

Connect Gmail -> AI routes emails to your applied jobs.

* "We'd like to interview you..." -> **Status: Interviewing** (Auto-updated)
* "Unfortunately..." -> **Status: Rejected** (Auto-updated)

See [post-application tracking docs](https://jobops.dakheera47.com/docs/features/post-application-tracking) for setup.

**Note on Analytics**: The alpha version includes anonymous analytics (Umami) to help debug performance. To opt-out, block `umami.dakheera47.com` in your firewall/DNS.

## Cloud Version (Coming Soon)

Self-hosting not your thing? A hosted version of JobOps is coming.

- No Docker required
- Up and running in 2 minutes
- Managed updates
- Self-hosted will always be free and open source

Join the waitlist at [https://try.jobops.app](https://try.jobops.app?utm_source=github&utm_medium=readme&utm_campaign=waitlist)
<br>
Support me on [kofi](https://ko-fi.com/shaheersarfaraz)

## Contributing

Want to contribute code, docs, or extractors? Start with [`CONTRIBUTING.md`](./CONTRIBUTING.md).


## Syncing with Upstream

```bash
git fetch upstream
git merge upstream/main
```

## License

**AGPLv3 + Commons Clause** - inherited from upstream. See [LICENSE](LICENSE).
