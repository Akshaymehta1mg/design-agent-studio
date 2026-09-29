// Adapted from beUI's Approval Card: beui.dev/components/agents/approval-card
// Changes: uses the studio's shadcn tokens and PressButton; status colors mapped to theme tokens.
import { ArrowLeft, ArrowRight, Check, CircleHelp, LoaderCircle, MessageSquareText, X } from "lucide-react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { AgentDisclosure } from "./agent-disclosure"
import { ActionSwapRollText } from "@/components/motion/action-swap"
import { PressButton } from "@/components/motion/button"
import { Checkbox, RadioGroup, RadioGroupItem } from "@/components/motion/choice"
import { EASE_OUT, SPRING_SWAP } from "@/lib/ease"
import { cn } from "@/lib/utils"

export type ApprovalCardStatus = "pending" | "submitting" | "approved" | "rejected" | "changes-requested" | "answered"

export interface ApprovalCardOption {
  value: string
  label: string
  disabled?: boolean
}

export interface ApprovalCardQuestion {
  id: string
  title: ReactNode
  description?: ReactNode
  options?: ApprovalCardOption[]
  multiple?: boolean
  autoAdvance?: boolean
  allowCustom?: boolean
  customPlaceholder?: string
}

export interface ApprovalCardAnswer {
  selected: string[]
  custom?: string
}

export type ApprovalCardAnswers = Record<string, ApprovalCardAnswer>

export interface ApprovalCardProps {
  title?: ReactNode
  description?: ReactNode
  children?: ReactNode
  questions?: ApprovalCardQuestion[]
  status?: ApprovalCardStatus
  defaultAnswers?: ApprovalCardAnswers
  onSubmit?: (answers: ApprovalCardAnswers) => void
  onApprove?: () => void
  onReject?: () => void
  onRequestChanges?: () => void
  approveLabel?: ReactNode
  submitLabel?: ReactNode
  result?: ReactNode
  /** Answered state: each question with the answer given */
  answers?: { question: ReactNode; answer: ReactNode }[]
  className?: string
}

const EMPTY: ApprovalCardAnswer = { selected: [], custom: "" }

function statusLabel(s: ApprovalCardStatus) {
  if (s === "submitting") return "Submitting"
  if (s === "approved") return "Approved"
  if (s === "rejected") return "Rejected"
  if (s === "changes-requested") return "Changes requested"
  if (s === "answered") return "Answered"
  return "Input required"
}

function statusIconClass(s: ApprovalCardStatus) {
  if (s === "approved" || s === "answered") return "text-ok"
  if (s === "rejected") return "text-destructive"
  if (s === "changes-requested") return "text-ember"
  return "text-ember"
}

function badgeClass(s: ApprovalCardStatus) {
  if (s === "pending" || s === "changes-requested") return "border-ember/30 bg-ember-soft text-ember"
  if (s === "submitting") return "border-pin/30 bg-pin/10 text-pin"
  if (s === "approved" || s === "answered") return "border-ok/30 bg-ok/10 text-ok"
  return "border-destructive/30 bg-destructive/10 text-destructive"
}

const isAnswered = (a: ApprovalCardAnswer) => a.selected.length > 0 || Boolean(a.custom?.trim())

function QuestionOptions({ question, answer, disabled, onChange, onSingleSelect }: { question: ApprovalCardQuestion; answer: ApprovalCardAnswer; disabled: boolean; onChange: (a: ApprovalCardAnswer) => void; onSingleSelect?: () => void }) {
  return (
    <div className="mt-3">
      {question.options?.length ? (
        question.multiple ? (
          <div className="grid gap-0.5">
            {question.options.map((o) => (
              <Checkbox
                key={o.value}
                checked={answer.selected.includes(o.value)}
                disabled={disabled || o.disabled}
                label={o.label}
                onCheckedChange={(c) => onChange({ ...answer, selected: c ? [...answer.selected, o.value] : answer.selected.filter((v) => v !== o.value) })}
                className="hover:bg-background/60 min-h-9 rounded-lg px-1.5 py-1"
              />
            ))}
          </div>
        ) : (
          <RadioGroup
            value={answer.selected[0] ?? ""}
            onValueChange={(v) => {
              onChange({ selected: [v], custom: "" })
              onSingleSelect?.()
            }}
            className="gap-0.5"
          >
            {question.options.map((o) => (
              <RadioGroupItem key={o.value} value={o.value} label={o.label} disabled={disabled || o.disabled} className="hover:bg-background/60 min-h-9 rounded-lg px-1.5 py-1" />
            ))}
          </RadioGroup>
        )
      ) : null}
      {question.allowCustom ? (
        <input
          value={answer.custom ?? ""}
          disabled={disabled}
          placeholder={question.customPlaceholder ?? "Add another response…"}
          onChange={(e) => onChange({ selected: question.multiple ? answer.selected : [], custom: e.target.value })}
          className={cn("bg-background/70 focus:bg-background focus:ring-ring/40 placeholder:text-muted-foreground/70 h-10 w-full rounded-xl px-3 text-sm outline-none focus:ring-2", question.options?.length && "mt-1.5")}
        />
      ) : null}
    </div>
  )
}

function ProgressDots({ current, ids }: { current: number; ids: string[] }) {
  return (
    <span className="flex gap-1.5">
      <span className="sr-only">
        Question {current + 1} of {ids.length}
      </span>
      {ids.map((id, i) => (
        <motion.span key={id} aria-hidden initial={false} animate={{ scale: i === current ? 1 : 0.75, opacity: i <= current ? 1 : 0.35 }} transition={SPRING_SWAP} className="bg-foreground size-1.5 rounded-full" />
      ))}
    </span>
  )
}

export function ApprovalCard({
  title = "Approval required",
  description,
  children,
  questions = [],
  status = "pending",
  defaultAnswers = {},
  onSubmit,
  onApprove,
  onReject,
  onRequestChanges,
  approveLabel = "Approve",
  submitLabel = "Submit response",
  result,
  answers: answered,
  className,
}: ApprovalCardProps) {
  const reduce = useReducedMotion() ?? false
  const [answers, setAnswers] = useState<ApprovalCardAnswers>(defaultAnswers)
  const [step, setStepState] = useState(0)
  const timer = useRef<number | undefined>(undefined)
  const currentStep = Math.min(Math.max(0, step), Math.max(0, questions.length - 1))
  const question = questions[currentStep]
  const questionMode = questions.length > 0
  const multiple = questions.length > 1
  const busy = status === "submitting"
  const interactive = status === "pending" || busy
  const currentAnswer = question ? answers[question.id] ?? EMPTY : EMPTY
  // Once answered, the card is about its own title, not whichever question came last.
  const displayTitle = interactive ? question?.title ?? title : title
  const titleKey = interactive ? question?.id ?? String(status) : String(status)

  const clear = useCallback(() => {
    if (timer.current !== undefined) window.clearTimeout(timer.current)
    timer.current = undefined
  }, [])
  useEffect(() => clear, [clear])

  const setStep = (n: number) => {
    clear()
    setStepState(n)
  }
  const update = (next: ApprovalCardAnswer) => question && setAnswers({ ...answers, [question.id]: next })
  const next = () => (currentStep < questions.length - 1 ? setStep(currentStep + 1) : onSubmit?.(answers))
  const autoAdvance = () => {
    if (!question || question.multiple || question.autoAdvance === false || currentStep >= questions.length - 1 || busy) return
    clear()
    timer.current = window.setTimeout(() => setStep(currentStep + 1), 240)
  }

  return (
    <div data-state={status} aria-busy={busy} className={cn("bg-muted w-full overflow-hidden rounded-2xl p-4 text-sm", className)}>
      <div className="flex items-start gap-3">
        <span aria-hidden className={cn("grid size-5 shrink-0 place-items-center", statusIconClass(status))}>
          {busy ? (
            <LoaderCircle className={cn("size-4", !reduce && "animate-spin")} />
          ) : interactive ? (
            questionMode ? <CircleHelp className="size-4" /> : <MessageSquareText className="size-4" />
          ) : status === "rejected" ? (
            <X className="size-4" />
          ) : (
            <Check className="size-4" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start gap-3">
            <h3 className="text-foreground min-w-0 flex-1 font-sans text-[15px] leading-5 font-medium tracking-normal">
              <ActionSwapRollText value={titleKey} wrap>{displayTitle}</ActionSwapRollText>
            </h3>
            {questionMode && interactive ? (
              multiple ? (
                <span className="text-muted-foreground/65 shrink-0 text-xs tabular-nums">
                  {currentStep + 1}/{questions.length}
                </span>
              ) : null
            ) : (
              <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors", badgeClass(status))}>{statusLabel(status)}</span>
            )}
          </div>

          <AgentDisclosure open={interactive}>
            {questionMode && question ? (
              <AnimatePresence initial={false} mode="wait">
                <motion.div
                  key={question.id}
                  initial={reduce ? { opacity: 1 } : { opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, x: -6 }}
                  transition={{ duration: reduce ? 0 : 0.2, ease: EASE_OUT }}
                >
                  {question.description ? <p className="text-muted-foreground mt-1 leading-5">{question.description}</p> : null}
                  <QuestionOptions question={question} answer={currentAnswer} disabled={busy} onChange={update} onSingleSelect={autoAdvance} />
                </motion.div>
              </AnimatePresence>
            ) : (
              <div>
                {description ? <p className="text-muted-foreground mt-1 leading-5">{description}</p> : null}
                {children ? <div className="mt-3">{children}</div> : null}
              </div>
            )}

            {questionMode ? (
              <div className="mt-4 flex items-center gap-3">
                {multiple ? (
                  <>
                    <PressButton variant="ghost" size="icon" aria-label="Previous question" disabled={busy || currentStep === 0} onClick={() => setStep(currentStep - 1)} className="size-8 rounded-full">
                      <ArrowLeft className="size-4" />
                    </PressButton>
                    <ProgressDots current={currentStep} ids={questions.map((q) => q.id)} />
                  </>
                ) : null}
                <PressButton
                  size={currentStep === questions.length - 1 ? "sm" : "icon"}
                  aria-label={currentStep === questions.length - 1 ? "Submit response" : "Next question"}
                  disabled={busy || !isAnswered(currentAnswer)}
                  onClick={next}
                  className={cn("ml-auto rounded-full", currentStep !== questions.length - 1 && "size-8")}
                >
                  {busy ? (
                    <LoaderCircle className={cn("size-4", !reduce && "animate-spin")} />
                  ) : currentStep === questions.length - 1 ? (
                    <>
                      {submitLabel}
                      <ArrowRight className="size-3.5" />
                    </>
                  ) : (
                    <ArrowRight className="size-4" />
                  )}
                </PressButton>
              </div>
            ) : (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <PressButton size="sm" disabled={busy} onClick={onApprove} className="rounded-full">
                  {approveLabel}
                </PressButton>
                {onRequestChanges ? (
                  <PressButton variant="secondary" size="sm" disabled={busy} onClick={onRequestChanges} className="bg-background/70 hover:bg-background rounded-full">
                    Request changes
                  </PressButton>
                ) : null}
                {onReject ? (
                  <PressButton variant="ghost" size="sm" disabled={busy} onClick={onReject} className="text-muted-foreground hover:text-destructive rounded-full">
                    Reject
                  </PressButton>
                ) : null}
              </div>
            )}
          </AgentDisclosure>

          {!interactive ? answered?.length ? <AnswerList answers={answered} /> : <p className="text-muted-foreground mt-1 text-sm">{result ?? statusLabel(status)}</p> : null}
        </div>
      </div>
    </div>
  )
}

const ANSWERS_SHOWN = 3

/** Answered state: one row per question, the question small and muted, the answer below it. */
function AnswerList({ answers }: { answers: { question: ReactNode; answer: ReactNode }[] }) {
  const [all, setAll] = useState(false)
  const shown = all ? answers : answers.slice(0, ANSWERS_SHOWN)
  const hidden = answers.length - shown.length
  return (
    <div className="mt-3">
      <dl className="bg-background/70 divide-border/70 flex flex-col divide-y rounded-xl">
        {shown.map((a, i) => (
          <div key={i} className="px-3 py-2.5">
            <dt className="text-muted-foreground text-[12px] leading-snug">{a.question}</dt>
            <dd className="text-foreground mt-0.5 text-[13.5px] leading-snug font-medium">{a.answer}</dd>
          </div>
        ))}
      </dl>
      {answers.length > ANSWERS_SHOWN && (
        <button type="button" onClick={() => setAll(!all)} className="text-muted-foreground hover:text-foreground mt-2 px-1 text-[12.5px] font-medium">
          {all ? "Show less" : `Show ${hidden} more`}
        </button>
      )}
    </div>
  )
}
