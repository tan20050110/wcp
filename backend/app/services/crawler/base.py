import httpx
import logging
from typing import Optional

logger = logging.getLogger(__name__)

class BaseCrawler:
    def __init__(self, name: str, timeout: int = 30):
        self.name = name
        self.timeout = timeout

    async def fetch(self, url: str, headers: dict = None) -> Optional[str]:
        default_headers = {"User-Agent": "WorldCupPredictor/1.0 (educational project)"}
        if headers:
            default_headers.update(headers)
        try:
            async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=True) as client:
                resp = await client.get(url, headers=default_headers)
                resp.raise_for_status()
                return resp.text
        except Exception as e:
            logger.error(f"[{self.name}] Failed to fetch {url}: {e}")
            return None

    async def fetch_json(self, url: str, headers: dict = None) -> Optional[dict]:
        default_headers = {"User-Agent": "WorldCupPredictor/1.0"}
        if headers:
            default_headers.update(headers)
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.get(url, headers=default_headers)
                resp.raise_for_status()
                return resp.json()
        except Exception as e:
            logger.error(f"[{self.name}] Failed to fetch JSON {url}: {e}")
            return None

    async def run(self):
        raise NotImplementedError
