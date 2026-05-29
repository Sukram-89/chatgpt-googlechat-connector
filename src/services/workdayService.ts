const ARBETSDAG_API_URL = "https://api.arbetsdag.se/v2/dagar.json";
const WORKDAY_TIME_ZONE = "Europe/Stockholm";

interface ArbetsdagResponse {
  status: string;
  meddelande?: string;
  antal_arbetsdagar?: number;
  helgdagar?: Array<{
    datum?: string;
    helgdag?: string;
  }>;
}

export interface DayOff {
  date: string;
  name: string;
  displayName: string;
}

function cleanHolidayName(value: string) {
  return value
    .replace(/^[A-Za-zÅÄÖåäö]{2,4}\s+\d{4}-\d{2}-\d{2}:\s*/, "")
    .trim();
}

function getStockholmDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: WORKDAY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short"
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value])
  );

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    weekday: values.weekday
  };
}

function toDateOnly(parts: { year: number; month: number; day: number }) {
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(
    parts.day
  ).padStart(2, "0")}`;
}

export function isWeekday(date: Date) {
  const weekday = getStockholmDateParts(date).weekday.toLowerCase();

  return !weekday.startsWith("lör") && !weekday.startsWith("sön");
}

function getLastDayOfMonth(date: Date) {
  const { year, month } = getStockholmDateParts(date);

  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

async function getWorkdayRange(from: string, to: string) {
  const apiKey = process.env.ARBETSDAG_API_KEY;

  if (!apiKey) {
    throw new Error("Missing ARBETSDAG_API_KEY");
  }

  const params = new URLSearchParams({
    fran: from,
    till: to,
    key: apiKey
  });
  const response = await fetch(`${ARBETSDAG_API_URL}?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`Arbetsdag API failed with status ${response.status}`);
  }

  const result = (await response.json()) as ArbetsdagResponse;

  if (result.status !== "OK") {
    throw new Error(result.meddelande || "Arbetsdag API returned an error");
  }

  return {
    workdays: Number(result.antal_arbetsdagar || 0),
    daysOff: (result.helgdagar || [])
      .map((holiday) => ({
        date: holiday.datum || "",
        name: holiday.helgdag || "Day off",
        displayName: cleanHolidayName(holiday.helgdag || "Day off")
      }))
      .filter((dayOff): dayOff is DayOff => Boolean(dayOff.date))
  };
}

export async function isLastWorkdayOfMonth(now = new Date()) {
  const todayParts = getStockholmDateParts(now);
  const today = getTodayDateOnly(now);
  const firstDayOfMonth = toDateOnly({
    year: todayParts.year,
    month: todayParts.month,
    day: 1
  });
  const lastDayOfMonth = toDateOnly({
    year: todayParts.year,
    month: todayParts.month,
    day: getLastDayOfMonth(now)
  });
  const [remainingRange, monthRange] = await Promise.all([
    getWorkdayRange(today, lastDayOfMonth),
    getWorkdayRange(firstDayOfMonth, lastDayOfMonth)
  ]);

  return {
    isLastWorkday: remainingRange.workdays === 1,
    today,
    firstDayOfMonth,
    lastDayOfMonth,
    remainingWorkdaysInMonth: remainingRange.workdays,
    monthWorkdays: monthRange.workdays,
    expectedHours: monthRange.workdays * 8,
    daysOff: monthRange.daysOff
  };
}

export function getTodayDateOnly(now = new Date()) {
  return toDateOnly(getStockholmDateParts(now));
}

export function getStockholmDayOfMonth(now = new Date()) {
  return getStockholmDateParts(now).day;
}
