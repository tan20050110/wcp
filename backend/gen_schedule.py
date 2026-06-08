import json

# Official FIFA 2026 schedule with Eastern Time converted to UTC (ET=UTC-4 in June)
# Format: (home, away, "YYYY-MM-DDTHH:MM:SSZ", "venue")
ET_OFFSET = 4  # Eastern Daylight Time is UTC-4

def et(hour, minute=0):
    """Convert ET time to UTC ISO string on given date."""
    return lambda d: f"2026-06-{d:02d}T{hour+ET_OFFSET:02d}:{minute:02d}:00Z" if hour+ET_OFFSET < 24 else f"2026-06-{d+1:02d}T{hour+ET_OFFSET-24:02d}:{minute:02d}:00Z"

def et_jul(hour, day, minute=0):
    return f"2026-07-{day:02d}T{hour+ET_OFFSET:02d}:{minute:02d}:00Z"

# All 72 group stage matches from official FIFA schedule
schedule = {
    "A": [
        ("MEX","RSA", et(15)(11), "Estadio Azteca, Mexico City"),
        ("KOR","CZE", et(22)(11), "Estadio Akron, Guadalajara"),
        ("CZE","RSA", et(12)(18), "Mercedes-Benz Stadium, Atlanta"),
        ("MEX","KOR", et(21)(18), "Estadio Akron, Guadalajara"),
        ("CZE","MEX", et(21)(24), "Estadio Azteca, Mexico City"),
        ("RSA","KOR", et(21)(24), "Estadio BBVA, Monterrey"),
    ],
    "B": [
        ("CAN","BIH", et(15)(12), "BMO Field, Toronto"),
        ("QAT","SUI", et(15)(13), "Levis Stadium, San Francisco"),
        ("SUI","BIH", et(15)(18), "SoFi Stadium, Los Angeles"),
        ("CAN","QAT", et(18)(18), "BC Place, Vancouver"),
        ("CAN","SUI", et(15)(24), "BC Place, Vancouver"),
        ("BIH","QAT", et(15)(24), "Lumen Field, Seattle"),
    ],
    "C": [
        ("BRA","MAR", et(18)(13), "MetLife Stadium, New Jersey"),
        ("HAI","SCO", et(21)(13), "Gillette Stadium, Boston"),
        ("SCO","MAR", et(18)(19), "Gillette Stadium, Boston"),
        ("BRA","HAI", et(21)(19), "Lincoln Financial Field, Philadelphia"),
        ("SCO","BRA", et(18)(24), "Hard Rock Stadium, Miami"),
        ("MAR","HAI", et(18)(24), "Mercedes-Benz Stadium, Atlanta"),
    ],
    "D": [
        ("USA","PAR", et(21)(12), "SoFi Stadium, Los Angeles"),
        ("AUS","TUR", et(0)(15), "BC Place, Vancouver"),  # 12am ET = 4am UTC
        ("USA","AUS", et(15)(19), "Lumen Field, Seattle"),
        ("TUR","PAR", et(0)(20), "Levis Stadium, San Francisco"),  # 12am ET
        ("USA","TUR", et(22)(25), "SoFi Stadium, Los Angeles"),
        ("PAR","AUS", et(22)(25), "Levis Stadium, San Francisco"),
    ],
    "E": [
        ("GER","CUW", et(13)(14), "NRG Stadium, Houston"),
        ("CIV","ECU", et(19)(14), "Lincoln Financial Field, Philadelphia"),
        ("GER","CIV", et(16)(20), "BMO Field, Toronto"),
        ("ECU","CUW", et(20)(20), "Arrowhead Stadium, Kansas City"),
        ("ECU","GER", et(16)(25), "MetLife Stadium, New Jersey"),
        ("CUW","CIV", et(16)(25), "Lincoln Financial Field, Philadelphia"),
    ],
    "F": [
        ("NED","JPN", et(16)(14), "AT&T Stadium, Dallas"),
        ("SWE","TUN", et(22)(14), "Estadio BBVA, Monterrey"),
        ("NED","SWE", et(13)(20), "NRG Stadium, Houston"),
        ("TUN","JPN", et(0)(21), "Estadio BBVA, Monterrey"),  # 12am ET
        ("JPN","SWE", et(19)(25), "AT&T Stadium, Dallas"),
        ("TUN","NED", et(19)(25), "Arrowhead Stadium, Kansas City"),
    ],
    "G": [
        ("BEL","EGY", et(15)(15), "Lumen Field, Seattle"),
        ("IRN","NZL", et(21)(15), "SoFi Stadium, Los Angeles"),
        ("BEL","IRN", et(15)(21), "SoFi Stadium, Los Angeles"),
        ("NZL","EGY", et(21)(21), "BC Place, Vancouver"),
        ("EGY","IRN", et(23)(26), "Lumen Field, Seattle"),  # 11pm ET
        ("NZL","BEL", et(23)(26), "BC Place, Vancouver"),
    ],
    "H": [
        ("ESP","CPV", et(12)(15), "Mercedes-Benz Stadium, Atlanta"),
        ("KSA","URU", et(18)(15), "Hard Rock Stadium, Miami"),
        ("ESP","KSA", et(12)(21), "Mercedes-Benz Stadium, Atlanta"),
        ("URU","CPV", et(18)(21), "Hard Rock Stadium, Miami"),
        ("CPV","KSA", et(20)(26), "NRG Stadium, Houston"),  # 8pm ET
        ("URU","ESP", et(23)(26), "Estadio Akron, Guadalajara"),
    ],
    "I": [
        ("FRA","SEN", et(15)(16), "MetLife Stadium, New Jersey"),
        ("IRQ","NOR", et(18)(16), "Gillette Stadium, Boston"),
        ("FRA","IRQ", et(17)(22), "Lincoln Financial Field, Philadelphia"),
        ("NOR","SEN", et(20)(22), "MetLife Stadium, New Jersey"),
        ("NOR","FRA", et(15)(26), "Gillette Stadium, Boston"),
        ("SEN","IRQ", et(15)(26), "BMO Field, Toronto"),
    ],
    "J": [
        ("ARG","ALG", et(21)(16), "Arrowhead Stadium, Kansas City"),
        ("AUT","JOR", et(0)(17), "Levis Stadium, San Francisco"),  # 12am ET
        ("ARG","AUT", et(13)(22), "AT&T Stadium, Dallas"),
        ("JOR","ALG", et(23)(22), "Levis Stadium, San Francisco"),  # 11pm ET
        ("ALG","AUT", et(22)(27), "Arrowhead Stadium, Kansas City"),
        ("JOR","ARG", et(22)(27), "AT&T Stadium, Dallas"),
    ],
    "K": [
        ("POR","COD", et(13)(17), "NRG Stadium, Houston"),
        ("UZB","COL", et(22)(17), "Estadio Azteca, Mexico City"),
        ("POR","UZB", et(13)(23), "NRG Stadium, Houston"),
        ("COL","COD", et(22)(23), "Estadio Akron, Guadalajara"),
        ("COL","POR", et(19)(27)+"30", "Hard Rock Stadium, Miami"),  # 7:30pm ET
        ("COD","UZB", et(19)(27)+"30", "Mercedes-Benz Stadium, Atlanta"),
    ],
    "L": [
        ("ENG","CRO", et(16)(17), "AT&T Stadium, Dallas"),
        ("GHA","PAN", et(19)(17), "BMO Field, Toronto"),
        ("ENG","GHA", et(16)(23), "Gillette Stadium, Boston"),
        ("PAN","CRO", et(19)(23), "BMO Field, Toronto"),
        ("PAN","ENG", et(17)(27), "MetLife Stadium, New Jersey"),
        ("CRO","GHA", et(17)(27), "Lincoln Financial Field, Philadelphia"),
    ],
}

# Fix K group times (7:30pm ET special)
schedule["K"][4] = ("COL","POR","2026-06-27T23:30:00Z","Hard Rock Stadium, Miami")
schedule["K"][5] = ("COD","UZB","2026-06-27T23:30:00Z","Mercedes-Benz Stadium, Atlanta")

matches = []
for g, fixtures in schedule.items():
    for h, a, d, v in fixtures:
        # Clean up the date string
        date_str = d if isinstance(d, str) else d(0)
        matches.append({"home_code": h, "away_code": a, "match_date": date_str, "stage": "group", "group": g, "venue": v})

matches.sort(key=lambda m: m["match_date"])
with open("data/matches_2026.json", "w") as f:
    json.dump(matches, f, indent=2)

print(f"{len(matches)} matches")
from collections import Counter
for d, c in sorted(Counter(m["match_date"][:10] for m in matches).items()):
    print(f"  {d}: {c}")
