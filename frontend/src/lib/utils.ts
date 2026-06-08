export function cn(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

// FIFA code to ISO 3166-1 alpha-2 for flag CDN
const FIFA_TO_ISO: Record<string, string> = {
  ENG: "gb", SCO: "gb", WAL: "gb", NIR: "gb", NED: "nl",
  GER: "de", DEN: "dk", SUI: "ch", CRO: "hr", SRB: "rs",
  URU: "uy", PAR: "py", NGA: "ng", CMR: "cm", ALG: "dz",
  KSA: "sa", IRQ: "iq", UAE: "ae", QAT: "qa", MAR: "ma",
  CRC: "cr", HUN: "hu", POR: "pt", ESP: "es", ITA: "it",
  UKR: "ua", SWE: "se", NOR: "no", CHI: "cl", ECU: "ec",
  PAN: "pa", CIV: "ci", GHA: "gh", TUN: "tn", SEN: "sn",
  IRN: "ir", PER: "pe", COL: "co", EGY: "eg", KOR: "kr",
  JPN: "jp", AUS: "au", NZL: "nz", MEX: "mx", USA: "us",
  CAN: "ca", BRA: "br", ARG: "ar", BEL: "be", FRA: "fr",
  BIH: "ba", CZE: "cz", TUR: "tr", RSA: "za", COD: "cd",
  UZB: "uz", JOR: "jo", HAI: "ht", CUW: "cw", CPV: "cv",
  AUT: "at",  // Austria
};

export function getFlagUrl(fifaCode: string): string {
  const iso = FIFA_TO_ISO[fifaCode] || fifaCode.toLowerCase().slice(0, 2);
  return `https://flagcdn.com/w80/${iso}.png`;
}

export const API_BASE = "/api";
export const WS_URL = `ws://${window.location.hostname}:8000/ws/updates`;
