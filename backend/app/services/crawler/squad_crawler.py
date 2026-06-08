"""
Free squad data crawler — scrapes Wikipedia for team rosters and coaches.
No API key required. Rate-limited to be respectful.
"""
import asyncio
import logging
from bs4 import BeautifulSoup
from .base import BaseCrawler
from ...core.database import async_session
from ...models.team import Team
from sqlalchemy import select

logger = logging.getLogger(__name__)

# 2026 World Cup teams with their Wikipedia page slugs
TEAM_WIKI = {
    "CAN": "Canada_men's_national_soccer_team",
    "MEX": "Mexico_national_football_team",
    "USA": "United_States_men's_national_soccer_team",
    "ARG": "Argentina_national_football_team",
    "BRA": "Brazil_national_football_team",
    "URU": "Uruguay_national_football_team",
    "COL": "Colombia_national_football_team",
    "PER": "Peru_national_football_team",
    "ECU": "Ecuador_national_football_team",
    "CHI": "Chile_national_football_team",
    "PAR": "Paraguay_national_football_team",
    "ENG": "England_national_football_team",
    "FRA": "France_national_football_team",
    "GER": "Germany_national_football_team",
    "ESP": "Spain_national_football_team",
    "ITA": "Italy_national_football_team",
    "NED": "Netherlands_national_football_team",
    "POR": "Portugal_national_football_team",
    "BEL": "Belgium_national_football_team",
    "CRO": "Croatia_national_football_team",
    "DEN": "Denmark_national_football_team",
    "SUI": "Switzerland_national_football_team",
    "SWE": "Sweden_national_football_team",
    "NOR": "Norway_national_football_team",
    "SCO": "Scotland_national_football_team",
    "HUN": "Hungary_national_football_team",
    "UKR": "Ukraine_national_football_team",
    "SRB": "Serbia_national_football_team",
    "POL": "Poland_national_football_team",  # not in current 48, added for completeness
    "JPN": "Japan_national_football_team",
    "KOR": "South_Korea_national_football_team",
    "IRN": "Iran_national_football_team",
    "KSA": "Saudi_Arabia_national_football_team",
    "AUS": "Australia_men's_national_soccer_team",
    "MAR": "Morocco_national_football_team",
    "SEN": "Senegal_national_football_team",
    "TUN": "Tunisia_national_football_team",
    "ALG": "Algeria_national_football_team",
    "EGY": "Egypt_national_football_team",
    "NGA": "Nigeria_national_football_team",
    "GHA": "Ghana_national_football_team",
    "CIV": "Ivory_Coast_national_football_team",
    "CMR": "Cameroon_national_football_team",
    "NZL": "New_Zealand_men's_national_football_team",
    "QAT": "Qatar_national_football_team",
    "UAE": "United_Arab_Emirates_national_football_team",
    "IRQ": "Iraq_national_football_team",
    "CRC": "Costa_Rica_national_football_team",
    "PAN": "Panama_national_football_team",
}

class SquadCrawler(BaseCrawler):
    def __init__(self):
        super().__init__("SquadCrawler", timeout=30)

    async def fetch_players(self, fifa_code: str) -> dict:
        """Fetch players and coach from Wikipedia for a national team."""
        wiki_slug = TEAM_WIKI.get(fifa_code)
        if not wiki_slug:
            return {"players": [], "coach": None}

        url = f"https://en.wikipedia.org/wiki/{wiki_slug}"
        html = await self.fetch(url)
        if not html:
            return {"players": [], "coach": None}

        soup = BeautifulSoup(html, "html.parser")
        return self._parse_squad(soup)

    def _parse_squad(self, soup: BeautifulSoup) -> dict:
        players = []
        coach = None

        # Find the "Current squad" or "Players" section
        for heading in soup.find_all(["h2", "h3"]):
            span = heading.find("span", class_="mw-headline")
            if not span:
                continue
            text = span.get_text(strip=True).lower()
            if "current squad" not in text and "players" not in text:
                continue

            # Find the first wikitable after the heading
            table = heading.find_next("table", class_="wikitable")
            if not table:
                continue

            for row in table.find_all("tr")[1:]:  # skip header
                cols = row.find_all("td")
                if len(cols) < 3:
                    continue

                try:
                    name_el = cols[0].find("a")
                    name = name_el.get_text(strip=True) if name_el else cols[0].get_text(strip=True)
                    if not name or name in ("", "—"):
                        continue

                    position = cols[1].get_text(strip=True) if len(cols) > 1 else ""
                    age_text = cols[2].get_text(strip=True) if len(cols) > 2 else ""
                    age = int("".join(c for c in age_text if c.isdigit())) if any(c.isdigit() for c in age_text) else None

                    caps = 0
                    goals = 0
                    club = ""
                    if len(cols) > 3:
                        caps_text = cols[3].get_text(strip=True) if len(cols) > 3 else "0"
                        caps = int("".join(c for c in caps_text if c.isdigit()) or "0")
                    if len(cols) > 4:
                        goals_text = cols[4].get_text(strip=True) if len(cols) > 4 else "0"
                        goals = int("".join(c for c in goals_text if c.isdigit()) or "0")
                    if len(cols) > 5:
                        club_el = cols[5].find("a")
                        club = club_el.get_text(strip=True) if club_el else cols[5].get_text(strip=True)

                    players.append({
                        "name": name, "position": position, "age": age,
                        "caps": caps, "goals": goals, "club": club,
                    })
                except (ValueError, IndexError):
                    continue

            # Look for coach info near the table
            coach_el = heading.find_previous("table", class_="infobox")
            if coach_el:
                for row in coach_el.find_all("tr"):
                    th = row.find("th")
                    if th and "head coach" in th.get_text(strip=True).lower():
                        td = row.find("td")
                        if td:
                            coach_a = td.find("a")
                            coach = coach_a.get_text(strip=True) if coach_a else td.get_text(strip=True)

            if coach is None:
                # Try finding coach in the infobox above
                infobox = heading.find_previous("table", class_="infobox")
                if infobox:
                    for row in infobox.find_all("tr"):
                        th = row.find("th")
                        if th and "head coach" in th.get_text(strip=True).lower():
                            coach_a = row.find("td").find("a") if row.find("td") else None
                            coach = coach_a.get_text(strip=True) if coach_a else (row.find("td").get_text(strip=True) if row.find("td") else None)

            break  # Only process first squad table

        return {"players": players[:26], "coach": coach}

    async def run(self):
        """Fetch squads for all teams in the database."""
        async with async_session() as db:
            result = await db.execute(select(Team))
            teams = result.scalars().all()

            for team in teams:
                logger.info(f"Fetching squad for {team.name} ({team.fifa_code})...")
                data = await self.fetch_players(team.fifa_code)

                if data["players"]:
                    team.squad_json = data["players"]
                    logger.info(f"  → {len(data['players'])} players")

                if data["coach"]:
                    team.coach_name = data["coach"]
                    logger.info(f"  → Coach: {data['coach']}")

                await db.commit()
                await asyncio.sleep(1)  # Rate limit

        logger.info("Squad crawl complete")


squad_crawler = SquadCrawler()
