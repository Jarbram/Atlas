"""
Atlas Radar Worker — Background job queue processor for scraping job listings.

Architecture:
  - Polls radar_search_configs from Supabase for active configurations
  - Launches scrapers for each active source
  - Normalizes and deduplicates results
  - POSTs results to Atlas webhook endpoint (apps/web/app/api/radar/webhook)
  - Implements polite scraping: rate limits, random delays, rotating user agents

Requirements: See requirements.txt
Usage: python queue_worker.py
"""

import asyncio
import hashlib
import hmac
import json
import logging
import os
import random
import time
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from typing import Optional

import httpx
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

# ─── Configuration ─────────────────────────────────────────────────────────────

SUPABASE_URL   = os.environ["SUPABASE_URL"]
SUPABASE_KEY   = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
WEBHOOK_URL    = os.environ["RADAR_WEBHOOK_URL"]
WORKER_SECRET  = os.environ["WORKER_SECRET"]
MAX_JOBS_BATCH = int(os.getenv("MAX_JOBS_BATCH", "50"))
REQUEST_DELAY  = float(os.getenv("REQUEST_DELAY_SECONDS", "2.5"))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger("atlas.radar")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ─── Data Models ───────────────────────────────────────────────────────────────

@dataclass
class NormalizedJob:
    """Normalized job listing ready to be ingested by Atlas."""
    source: str
    external_id: str
    title: str
    company: str
    company_logo_url: Optional[str]
    seniority: str
    modality: str
    location: str
    salary_min: Optional[float]
    salary_max: Optional[float]
    salary_currency: str
    salary_period: Optional[str]
    description_raw: str
    apply_url: str
    posted_at: Optional[str]
    radar_tags: list[str]

# ─── Seniority Detection ───────────────────────────────────────────────────────

SENIORITY_KEYWORDS = {
    "intern":    ["intern", "internship", "trainee", "practicante"],
    "junior":    ["junior", "jr.", "entry level", "entry-level", "0-2 years"],
    "mid":       ["mid", "mid-level", "intermediate", "2-5 years", "3+ years"],
    "senior":    ["senior", "sr.", "5+ years", "7+ years"],
    "staff":     ["staff engineer", "tech lead", "lead engineer"],
    "principal": ["principal", "architect", "10+ years"],
    "director":  ["director", "head of"],
    "vp":        ["vp of", "vice president"],
    "c_level":   ["cto", "ceo", "cpo", "chief"],
}

def detect_seniority(title: str, description: str) -> str:
    """Detects seniority level from job title and description."""
    text = f"{title} {description}".lower()
    for level, keywords in SENIORITY_KEYWORDS.items():
        if any(kw in text for kw in keywords):
            return level
    return "mid"  # Default assumption

def detect_modality(title: str, description: str, location: str) -> str:
    """Detects work modality from text."""
    text = f"{title} {description} {location}".lower()
    if any(kw in text for kw in ["remote", "fully remote", "work from home", "wfh", "100% remote"]):
        return "remote"
    if any(kw in text for kw in ["hybrid", "flexible", "partially remote"]):
        return "hybrid"
    return "onsite"

# ─── HMAC Webhook Authentication ─────────────────────────────────────────────

def sign_payload(payload: str) -> str:
    """Signs the webhook payload with HMAC-SHA256 for security."""
    return hmac.new(
        WORKER_SECRET.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()

# ─── Webhook Delivery ─────────────────────────────────────────────────────────

async def post_jobs_to_webhook(
    jobs: list[NormalizedJob],
    user_id: str,
    config_id: str
) -> bool:
    """
    POSTs normalized jobs to the Atlas webhook endpoint.
    Returns True if successful.
    """
    if not jobs:
        return True

    payload = {
        "user_id":   user_id,
        "config_id": config_id,
        "jobs":      [asdict(job) for job in jobs],
        "scraped_at": datetime.now(timezone.utc).isoformat(),
    }

    payload_str = json.dumps(payload)
    signature   = sign_payload(payload_str)

    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            WEBHOOK_URL,
            content=payload_str,
            headers={
                "Content-Type":        "application/json",
                "X-Atlas-Signature":   signature,
                "X-Atlas-Worker-Ver":  "1.0.0",
            },
        )

    if response.status_code == 200:
        logger.info(f"✅ Delivered {len(jobs)} jobs to webhook | config={config_id}")
        return True
    else:
        logger.error(f"❌ Webhook failed | status={response.status_code} | body={response.text[:200]}")
        return False

# ─── RemoteOK Scraper (Public API — no auth needed) ──────────────────────────

async def scrape_remoteok(config: dict) -> list[NormalizedJob]:
    """
    Scrapes RemoteOK public API.
    Docs: https://remoteok.com/api
    Polite: 1 request every 60 seconds max per their API rules.
    """
    logger.info("🔍 Scraping RemoteOK...")

    jobs: list[NormalizedJob] = []
    tags = config.get("keywords", []) + config.get("roles", [])

    async with httpx.AsyncClient(timeout=30, headers={"User-Agent": "AtlasBot/1.0 (+contact@atlas.app)"}) as client:
        for tag in tags[:3]:  # Max 3 tags per run
            await asyncio.sleep(REQUEST_DELAY + random.uniform(0.5, 2.0))

            try:
                url = f"https://remoteok.com/api?tag={tag.lower().replace(' ', '-')}"
                response = await client.get(url)

                if response.status_code != 200:
                    continue

                data = response.json()
                if not isinstance(data, list):
                    continue

                for item in data[1:]:  # First item is metadata
                    if not isinstance(item, dict):
                        continue

                    job = NormalizedJob(
                        source="remoteok",
                        external_id=str(item.get("id", "")),
                        title=item.get("position", ""),
                        company=item.get("company", ""),
                        company_logo_url=item.get("company_logo"),
                        seniority=detect_seniority(
                            item.get("position", ""),
                            item.get("description", "")
                        ),
                        modality="remote",
                        location=item.get("location", "Remote"),
                        salary_min=item.get("salary_min"),
                        salary_max=item.get("salary_max"),
                        salary_currency="USD",
                        salary_period="annual",
                        description_raw=item.get("description", ""),
                        apply_url=item.get("apply_url") or item.get("url", ""),
                        posted_at=item.get("date"),
                        radar_tags=[tag],
                    )

                    if job.external_id and job.title and job.apply_url:
                        jobs.append(job)

            except Exception as e:
                logger.warning(f"RemoteOK error for tag '{tag}': {e}")

    logger.info(f"  RemoteOK → {len(jobs)} jobs found")
    return jobs[:MAX_JOBS_BATCH]

# ─── GetOnBoard Scraper (Latin America focused) ───────────────────────────────

async def scrape_getonboard(config: dict) -> list[NormalizedJob]:
    """
    Scrapes GetOnBoard API for Latin American tech jobs.
    Uses public API endpoint.
    """
    logger.info("🔍 Scraping GetOnBoard...")
    jobs: list[NormalizedJob] = []
    keywords = config.get("keywords", []) + config.get("roles", [])

    async with httpx.AsyncClient(timeout=30) as client:
        for keyword in keywords[:3]:
            await asyncio.sleep(REQUEST_DELAY)

            try:
                params = {"query": keyword, "per_page": 20}
                if config.get("remote_only"):
                    params["remote"] = "true"

                response = await client.get(
                    "https://www.getonbrd.com/api/v0/jobs",
                    params=params,
                    headers={"User-Agent": "AtlasRadar/1.0"},
                )

                if response.status_code != 200:
                    continue

                data = response.json().get("data", [])

                for item in data:
                    attrs = item.get("attributes", {})
                    job = NormalizedJob(
                        source="getonboard",
                        external_id=str(item.get("id", "")),
                        title=attrs.get("title", ""),
                        company=attrs.get("company_name") or attrs.get("company", {}).get("data", {}).get("attributes", {}).get("name", ""),
                        company_logo_url=attrs.get("company_logo_url"),
                        seniority=detect_seniority(attrs.get("title", ""), attrs.get("description", "")),
                        modality="remote" if attrs.get("remote") else detect_modality(
                            attrs.get("title", ""), attrs.get("description", ""), attrs.get("country", "")
                        ),
                        location=attrs.get("country", "Latin America"),
                        salary_min=attrs.get("min_salary"),
                        salary_max=attrs.get("max_salary"),
                        salary_currency=attrs.get("currency", "USD"),
                        salary_period="monthly",
                        description_raw=attrs.get("description", ""),
                        apply_url=attrs.get("applications_url") or f"https://www.getonbrd.com/jobs/{item.get('id')}",
                        posted_at=attrs.get("published_at"),
                        radar_tags=[keyword],
                    )

                    if job.external_id and job.title:
                        jobs.append(job)

            except Exception as e:
                logger.warning(f"GetOnBoard error for '{keyword}': {e}")

    logger.info(f"  GetOnBoard → {len(jobs)} jobs found")
    return jobs[:MAX_JOBS_BATCH]

# ─── Main Radar Run ────────────────────────────────────────────────────────────

async def run_radar_for_config(config: dict) -> None:
    """
    Executes a full radar scan for a single user's search configuration.
    """
    config_id = config["id"]
    user_id   = config["user_id"]
    sources   = config.get("sources", ["remoteok", "getonboard"])

    logger.info(f"📡 Radar scan START | config={config_id} user={user_id} sources={sources}")

    all_jobs: list[NormalizedJob] = []

    # Run scrapers for active sources
    scraper_tasks = []
    if "remoteok" in sources:
        scraper_tasks.append(scrape_remoteok(config))
    if "getonboard" in sources:
        scraper_tasks.append(scrape_getonboard(config))

    results = await asyncio.gather(*scraper_tasks, return_exceptions=True)

    for result in results:
        if isinstance(result, list):
            all_jobs.extend(result)
        elif isinstance(result, Exception):
            logger.error(f"Scraper failed: {result}")

    # Deduplicate by source+external_id
    seen = set()
    unique_jobs = []
    for job in all_jobs:
        key = f"{job.source}:{job.external_id}"
        if key not in seen and job.external_id:
            seen.add(key)
            unique_jobs.append(job)

    logger.info(f"  Total: {len(all_jobs)} found, {len(unique_jobs)} unique")

    # Deliver to webhook
    if unique_jobs:
        await post_jobs_to_webhook(unique_jobs, user_id, config_id)

    # Update last_run_at
    supabase.table("radar_search_configs").update({
        "last_run_at": datetime.now(timezone.utc).isoformat()
    }).eq("id", config_id).execute()

    logger.info(f"📡 Radar scan END | config={config_id}")

async def radar_main_loop() -> None:
    """Main function: fetches active configs and runs radar scans."""
    logger.info("🚀 Atlas Radar Worker starting...")

    response = supabase.table("radar_search_configs") \
        .select("*") \
        .eq("is_active", True) \
        .execute()

    configs = response.data or []
    logger.info(f"Found {len(configs)} active radar configurations")

    # Run all configs concurrently (with semaphore to limit parallelism)
    semaphore = asyncio.Semaphore(3)

    async def run_with_semaphore(config):
        async with semaphore:
            try:
                await run_radar_for_config(config)
            except Exception as e:
                logger.error(f"Config {config['id']} failed: {e}")

    await asyncio.gather(*[run_with_semaphore(c) for c in configs])
    logger.info("✅ Radar sweep complete")

# ─── Entry Point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    scheduler = AsyncIOScheduler(timezone="UTC")
    # Default: run every 6 hours
    scheduler.add_job(radar_main_loop, "interval", hours=6, id="radar_sweep", next_run_time=datetime.now())
    scheduler.start()

    logger.info("⏱️  Scheduler started — radar sweeps every 6 hours")

    try:
        asyncio.get_event_loop().run_forever()
    except (KeyboardInterrupt, SystemExit):
        logger.info("🛑 Radar worker shutting down")
        scheduler.shutdown()
