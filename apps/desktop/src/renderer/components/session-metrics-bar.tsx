/**
 * Compact session metrics bar for the agent-detail app bar.
 *
 * Shows context window usage, work time, cost, tokens (with breakdown
 * tooltip), turn count, model distribution, cache efficiency, and
 * error/retry indicators.
 */
import { Tooltip, TooltipContent, TooltipTrigger } from "@palot/ui/components/tooltip"
import { cn } from "@palot/ui/lib/utils"
import { useAtomValue } from "jotai"
import {
	AlertTriangleIcon,
	CoinsIcon,
	MessageSquareIcon,
	RefreshCwIcon,
	TimerIcon,
	WrenchIcon,
	ZapIcon,
} from "lucide-react"
import { Fragment, memo, useCallback, useEffect, useMemo, useState } from "react"
import { sessionMetricsFamily } from "../atoms/derived/session-metrics"
import { messagesFamily } from "../atoms/messages"
import type { ProvidersData } from "../hooks/use-opencode-data"
import {
	type ContextUsage,
	computeContextUsage,
	formatPercentage,
	formatTokens,
	formatWorkDuration,
	shortModelName,
} from "../lib/session-metrics"

// ============================================================
// Tool category display labels
// ============================================================

const TOOL_CATEGORY_LABELS: Record<string, string> = {
	explore: "Read/Search",
	edit: "Edit/Write",
	run: "Run",
	delegate: "Agent",
	plan: "Plan",
	ask: "Ask",
	fetch: "Fetch",
	other: "Other",
}

// ============================================================
// SessionMetricsBar
// ============================================================

interface SessionMetricsBarProps {
	sessionId: string
	/** Provider data for context limit lookup (optional, degrades gracefully) */
	providers?: ProvidersData | null
}

/**
 * Compact metrics bar that reads from `sessionMetricsFamily` directly.
 * Only re-renders when the session's metrics change (structural equality).
 */
export const SessionMetricsBar = memo(function SessionMetricsBar({
	sessionId,
	providers,
}: SessionMetricsBarProps) {
	const metrics = useAtomValue(sessionMetricsFamily(sessionId))
	const messages = useAtomValue(messagesFamily(sessionId))

	// Build a stable context-limit lookup from provider data
	const getContextLimit = useCallback(
		(providerID: string, modelID: string): number | undefined => {
			if (!providers?.providers) return undefined
			for (const provider of providers.providers) {
				if (provider.id !== providerID) continue
				const model = provider.models[modelID]
				if (model?.limit?.context) return model.limit.context
			}
			return undefined
		},
		[providers],
	)

	const contextUsage = useMemo(
		() => computeContextUsage(messages, getContextLimit),
		[messages, getContextLimit],
	)

	if (metrics.exchangeCount === 0 && metrics.assistantMessageCount === 0) return null

	const { raw } = metrics

	return (
		<div className="flex items-center gap-1.5">
			{/* Context window usage */}
			{contextUsage && <ContextUsageIndicator usage={contextUsage} cost={metrics.cost} />}
			{contextUsage && <Separator />}

			{/* Work time */}
			<Tooltip>
				<TooltipTrigger
					render={
						<span className="inline-flex items-center gap-1 text-xs tabular-nums text-muted-foreground/60" />
					}
				>
					<TimerIcon className="size-3" aria-hidden="true" />
					{metrics.activeStartMs != null ? (
						<LiveWorkTime
							completedMs={metrics.completedWorkTimeMs}
							activeStartMs={metrics.activeStartMs}
						/>
					) : (
						metrics.workTime
					)}
				</TooltipTrigger>
				<TooltipContent side="bottom" align="end">
					<div className="space-y-1 text-xs">
						<p className="font-medium">Work Time</p>
						<p className="text-background/60">Avg per exchange: {metrics.avgExchangeTime}</p>
					</div>
				</TooltipContent>
			</Tooltip>

			<Separator />

			{/* Cost */}
			{metrics.costRaw > 0 && (
				<>
					<Tooltip>
						<TooltipTrigger
							render={
								<span className="inline-flex items-center gap-1 text-xs tabular-nums text-muted-foreground/60" />
							}
						>
							<CoinsIcon className="size-3" aria-hidden="true" />
							{metrics.cost}
						</TooltipTrigger>
						<TooltipContent side="bottom" align="end">
							<div className="space-y-1 text-xs">
								<p className="font-medium">Cost</p>
								<p className="text-background/60">Avg per exchange: {metrics.avgExchangeCost}</p>
							</div>
						</TooltipContent>
					</Tooltip>

					<Separator />
				</>
			)}

			{/* Tokens with breakdown tooltip */}
			{metrics.tokensRaw > 0 && (
				<>
					<Tooltip>
						<TooltipTrigger
							render={
								<span className="inline-flex items-center gap-1 text-xs tabular-nums text-muted-foreground/60" />
							}
						>
							<ZapIcon className="size-3" aria-hidden="true" />
							{metrics.tokens}
						</TooltipTrigger>
						<TooltipContent side="bottom" align="end">
							<div className="space-y-1.5 text-xs">
								<p className="font-medium">Token Breakdown (Session Total)</p>
								<div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-background/60">
									<span>Input</span>
									<span className="text-right tabular-nums">{formatTokens(raw.tokens.input)}</span>
									<span>Output</span>
									<span className="text-right tabular-nums">{formatTokens(raw.tokens.output)}</span>
									{raw.tokens.reasoning > 0 && (
										<>
											<span>Reasoning</span>
											<span className="text-right tabular-nums">
												{formatTokens(raw.tokens.reasoning)}
											</span>
										</>
									)}
									<span>Cache read</span>
									<span className="text-right tabular-nums">
										{formatTokens(raw.tokens.cacheRead)}
									</span>
									{raw.tokens.cacheWrite > 0 && (
										<>
											<span>Cache write</span>
											<span className="text-right tabular-nums">
												{formatTokens(raw.tokens.cacheWrite)}
											</span>
										</>
									)}
								</div>
								{metrics.cacheEfficiency > 0 && (
									<p className="border-t border-background/15 pt-1 text-background/60">
										Cache hit rate: {metrics.cacheEfficiencyFormatted}
									</p>
								)}
							</div>
						</TooltipContent>
					</Tooltip>

					<Separator />
				</>
			)}

			{/* Exchanges + message breakdown */}
			<Tooltip>
				<TooltipTrigger
					render={
						<span className="inline-flex items-center gap-1 text-xs tabular-nums text-muted-foreground/60" />
					}
				>
					<MessageSquareIcon className="size-3" aria-hidden="true" />
					{metrics.exchangeCount}
				</TooltipTrigger>
				<TooltipContent side="bottom" align="end">
					<div className="space-y-1.5 text-xs">
						<p className="font-medium">
							{metrics.exchangeCount} {metrics.exchangeCount === 1 ? "exchange" : "exchanges"}
						</p>
						<div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-background/60">
							<span>User messages</span>
							<span className="text-right tabular-nums">{metrics.userMessageCount}</span>
							<span>Agent responses</span>
							<span className="text-right tabular-nums">{metrics.assistantMessageCount}</span>
						</div>
						{metrics.modelDistributionDisplay.length > 0 && (
							<div className="border-t border-background/15 pt-1">
								<p className="mb-0.5 font-medium text-background/80">Models</p>
								<div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-background/60">
									{metrics.modelDistributionDisplay.map(({ name, count }) => (
										<Fragment key={name}>
											<span>{name}</span>
											<span className="text-right tabular-nums">{count}</span>
										</Fragment>
									))}
								</div>
							</div>
						)}
					</div>
				</TooltipContent>
			</Tooltip>

			{/* Tool calls */}
			{metrics.toolCallCount > 0 && (
				<>
					<Separator />
					<Tooltip>
						<TooltipTrigger
							render={
								<span className="inline-flex items-center gap-1 text-xs tabular-nums text-muted-foreground/60" />
							}
						>
							<WrenchIcon className="size-3" aria-hidden="true" />
							{metrics.toolCallCount}
						</TooltipTrigger>
						<TooltipContent side="bottom" align="end">
							<div className="space-y-1.5 text-xs">
								<p className="font-medium">Tool Calls</p>
								<div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-background/60">
									{Object.entries(metrics.toolBreakdown)
										.sort(([, a], [, b]) => (Number(b) || 0) - (Number(a) || 0))
										.map(([cat, count]) => (
											<Fragment key={cat}>
												<span>{TOOL_CATEGORY_LABELS[cat] ?? cat}</span>
												<span className="text-right tabular-nums">{count}</span>
											</Fragment>
										))}
								</div>
							</div>
						</TooltipContent>
					</Tooltip>
				</>
			)}

			{/* Error/retry indicators */}
			{metrics.errorCount > 0 && (
				<>
					<Separator />
					<Tooltip>
						<TooltipTrigger
							render={
								<span className="inline-flex items-center gap-1 text-xs tabular-nums text-red-400/70" />
							}
						>
							<AlertTriangleIcon className="size-3" aria-hidden="true" />
							{metrics.errorCount}
						</TooltipTrigger>
						<TooltipContent side="bottom" align="end">
							<p className="text-xs">
								{metrics.errorCount} {metrics.errorCount === 1 ? "error" : "errors"}
								{metrics.retryCount > 0 &&
									`, ${metrics.retryCount} ${metrics.retryCount === 1 ? "retry" : "retries"}`}
							</p>
						</TooltipContent>
					</Tooltip>
				</>
			)}

			{/* Retry indicator (when retries but no errors) */}
			{metrics.retryCount > 0 && metrics.errorCount === 0 && (
				<>
					<Separator />
					<Tooltip>
						<TooltipTrigger
							render={
								<span className="inline-flex items-center gap-1 text-xs tabular-nums text-yellow-500/70" />
							}
						>
							<RefreshCwIcon className="size-3" aria-hidden="true" />
							{metrics.retryCount}
						</TooltipTrigger>
						<TooltipContent side="bottom" align="end">
							<p className="text-xs">
								{metrics.retryCount} {metrics.retryCount === 1 ? "retry" : "retries"}{" "}
								(auto-recovered)
							</p>
						</TooltipContent>
					</Tooltip>
				</>
			)}
		</div>
	)
})

// ============================================================
// Live work-time ticker — updates every second while active
// ============================================================

/**
 * Tiny leaf component that ticks every second to show live work time.
 * Only mounts when the agent has an in-progress message, so the rest of
 * the metrics bar is not affected by the interval.
 */
function LiveWorkTime({
	completedMs,
	activeStartMs,
}: {
	completedMs: number
	activeStartMs: number
}) {
	const [display, setDisplay] = useState(() =>
		formatWorkDuration(completedMs + (Date.now() - activeStartMs)),
	)

	useEffect(() => {
		const tick = () => setDisplay(formatWorkDuration(completedMs + (Date.now() - activeStartMs)))
		tick()
		const id = setInterval(tick, 1_000)
		return () => clearInterval(id)
	}, [completedMs, activeStartMs])

	return <>{display}</>
}

// ============================================================
// Context window usage indicator
// ============================================================

/**
 * Compact circular progress + percentage showing how full the context window is.
 * Tooltip shows detailed info: token count, limit, model, and cost.
 */
const ContextUsageIndicator = memo(function ContextUsageIndicator({
	usage,
	cost,
}: {
	usage: ContextUsage
	cost: string
}) {
	const pct = usage.percentage
	const color =
		pct >= 90 ? "text-red-400" : pct >= 70 ? "text-yellow-400" : "text-muted-foreground/60"

	return (
		<Tooltip>
			<TooltipTrigger
				render={
					<span className={cn("inline-flex items-center gap-1 text-xs tabular-nums", color)} />
				}
			>
				<ContextCircle percentage={pct} size={14} strokeWidth={2} />
				{formatPercentage(pct)}
			</TooltipTrigger>
			<TooltipContent side="bottom" align="start">
				<div className="space-y-1.5 text-xs">
					<p className="font-medium">Context Window</p>
					<div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-background/60">
						<span>Usage</span>
						<span className="text-right tabular-nums">{formatPercentage(pct)}</span>
						<span>Tokens</span>
						<span className="text-right tabular-nums">
							{usage.lastMessageTokens.toLocaleString()}
						</span>
						<span>Limit</span>
						<span className="text-right tabular-nums">{usage.contextLimit.toLocaleString()}</span>
						<span>Model</span>
						<span className="text-right">{shortModelName(usage.modelID)}</span>
					</div>
					{cost !== "$0.00" && (
						<p className="border-t border-background/15 pt-1 text-background/60">
							Session cost: {cost}
						</p>
					)}
				</div>
			</TooltipContent>
		</Tooltip>
	)
})

// ============================================================
// SVG circular progress
// ============================================================

/**
 * Tiny SVG circle that fills clockwise based on percentage.
 * Uses stroke-dasharray/dashoffset for the arc.
 */
function ContextCircle({
	percentage,
	size = 14,
	strokeWidth = 2,
}: {
	percentage: number
	size?: number
	strokeWidth?: number
}) {
	const radius = (size - strokeWidth) / 2
	const circumference = 2 * Math.PI * radius
	const offset = circumference - (Math.min(percentage, 100) / 100) * circumference

	const strokeColor =
		percentage >= 90 ? "stroke-red-400" : percentage >= 70 ? "stroke-yellow-400" : "stroke-current"

	return (
		<svg
			width={size}
			height={size}
			viewBox={`0 0 ${size} ${size}`}
			className="shrink-0"
			aria-hidden="true"
		>
			{/* Background track */}
			<circle
				cx={size / 2}
				cy={size / 2}
				r={radius}
				fill="none"
				className="stroke-muted-foreground/15"
				strokeWidth={strokeWidth}
			/>
			{/* Filled arc */}
			<circle
				cx={size / 2}
				cy={size / 2}
				r={radius}
				fill="none"
				className={strokeColor}
				strokeWidth={strokeWidth}
				strokeDasharray={circumference}
				strokeDashoffset={offset}
				strokeLinecap="round"
				transform={`rotate(-90 ${size / 2} ${size / 2})`}
			/>
		</svg>
	)
}

// ============================================================
// Small separator dot
// ============================================================

function Separator() {
	return (
		<span className="text-muted-foreground/20" aria-hidden="true">
			·
		</span>
	)
}
