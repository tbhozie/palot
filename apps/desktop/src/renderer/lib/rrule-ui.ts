/**
 * Pure conversion functions between RRULE strings and UI-friendly schedule config.
 *
 * The SchedulePicker component uses ScheduleConfig internally, and these
 * functions convert to/from the RRULE string stored in automation configs.
 */

// ============================================================
// Types
// ============================================================

export type ScheduleMode = "daily" | "interval"

export type Weekday = "MO" | "TU" | "WE" | "TH" | "FR" | "SA" | "SU"

export const ALL_WEEKDAYS: Weekday[] = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"]

export const WEEKDAY_LABELS: Record<Weekday, string> = {
	MO: "Mo",
	TU: "Tu",
	WE: "We",
	TH: "Th",
	FR: "Fr",
	SA: "Sa",
	SU: "Su",
}

export interface ScheduleConfig {
	mode: ScheduleMode
	/** Time in HH:MM format (24h), used for daily mode */
	time: string
	/** Hours between runs, used for interval mode */
	intervalHours: number
	/** Active weekdays */
	weekdays: Weekday[]
}

// ============================================================
// Defaults
// ============================================================

export const DEFAULT_SCHEDULE_CONFIG: ScheduleConfig = {
	mode: "daily",
	time: "09:00",
	intervalHours: 24,
	weekdays: [...ALL_WEEKDAYS],
}

// ============================================================
// Conversion: ScheduleConfig -> RRULE string
// ============================================================

export function scheduleConfigToRrule(config: ScheduleConfig): string {
	const parts: string[] = []

	if (config.mode === "daily") {
		parts.push("FREQ=DAILY")
		const [hours, minutes] = config.time.split(":").map(Number)
		parts.push(`BYHOUR=${hours}`)
		parts.push(`BYMINUTE=${minutes}`)
	} else {
		// Interval mode: FREQ=HOURLY with INTERVAL
		parts.push("FREQ=HOURLY")
		parts.push(`INTERVAL=${config.intervalHours}`)
	}

	// Add weekday filter if not all days are selected
	if (config.weekdays.length > 0 && config.weekdays.length < 7) {
		parts.push(`BYDAY=${config.weekdays.join(",")}`)
	}

	return parts.join(";")
}

// ============================================================
// Conversion: RRULE string -> ScheduleConfig
// ============================================================

export function rruleToScheduleConfig(rrule: string): ScheduleConfig {
	const params = parseRruleParams(rrule)

	const freq = params.FREQ?.toUpperCase() ?? "DAILY"
	const byDay = params.BYDAY
		? (params.BYDAY.split(",").map((d) => d.trim().toUpperCase()) as Weekday[])
		: [...ALL_WEEKDAYS]

	if (freq === "HOURLY") {
		return {
			mode: "interval",
			time: "09:00",
			intervalHours: params.INTERVAL ? Number.parseInt(params.INTERVAL, 10) : 1,
			weekdays: byDay,
		}
	}

	// Daily mode (or other FREQ treated as daily)
	const hour = params.BYHOUR ? Number.parseInt(params.BYHOUR, 10) : 9
	const minute = params.BYMINUTE ? Number.parseInt(params.BYMINUTE, 10) : 0
	const time = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`

	return {
		mode: "daily",
		time,
		intervalHours: 24,
		weekdays: byDay,
	}
}

// ============================================================
// Human-readable schedule summary
// ============================================================

export function formatScheduleSummary(config: ScheduleConfig): string {
	if (config.mode === "interval") {
		const h = config.intervalHours
		return h === 1 ? "Every hour" : `Every ${h}h`
	}

	// Daily mode
	const allDays = config.weekdays.length === 7
	const weekdaysOnly =
		config.weekdays.length === 5 &&
		["MO", "TU", "WE", "TH", "FR"].every((d) => config.weekdays.includes(d as Weekday))
	const weekendsOnly =
		config.weekdays.length === 2 && config.weekdays.includes("SA") && config.weekdays.includes("SU")

	if (allDays) return `Daily at ${config.time}`
	if (weekdaysOnly) return `Weekdays at ${config.time}`
	if (weekendsOnly) return `Weekends at ${config.time}`

	const dayLabels = config.weekdays.map((d) => WEEKDAY_LABELS[d])
	return `${dayLabels.join(", ")} at ${config.time}`
}

// ============================================================
// Helpers
// ============================================================

function parseRruleParams(rrule: string): Record<string, string> {
	const result: Record<string, string> = {}
	// Strip leading "RRULE:" if present
	const clean = rrule.replace(/^RRULE:/i, "")
	for (const part of clean.split(";")) {
		const eqIdx = part.indexOf("=")
		if (eqIdx > 0) {
			const key = part.slice(0, eqIdx).toUpperCase()
			const value = part.slice(eqIdx + 1)
			result[key] = value
		}
	}
	return result
}
