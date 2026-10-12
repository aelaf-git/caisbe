import Link from "next/link";
import Card from "@/components/ui/Card";
import type { Enrollment } from "@/lib/auth";

function count(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function courseStatus(enrollment: Enrollment) {
  if (enrollment.status === "pending_payment") return "Awaiting payment";
  if (enrollment.status === "completed") return "Completed";
  return "In progress";
}

function examStatus(enrollment: Enrollment) {
  if (!enrollment.has_final_exam) return "No exam";
  if (enrollment.exam_passed) return "Passed";
  if (count(enrollment.topics_completed) === count(enrollment.topics_total)) return "Eligible";
  return "Not eligible";
}

function outstandingLines(enrollment: Enrollment) {
  const lines: string[] = [];
  if (enrollment.status === "pending_payment") lines.push("Complete payment");
  const topicsLeft = Math.max(0, count(enrollment.topics_total) - count(enrollment.topics_completed));
  const quizzesLeft = Math.max(0, count(enrollment.quizzes_total) - count(enrollment.quizzes_completed));
  const assignmentsLeft = Math.max(0, count(enrollment.assignments_total) - count(enrollment.assignments_completed));
  if (topicsLeft > 0) lines.push(`${topicsLeft} topic${topicsLeft === 1 ? "" : "s"} remaining`);
  if (quizzesLeft > 0) lines.push(`${quizzesLeft} quiz${quizzesLeft === 1 ? "" : "zes"} remaining`);
  if (assignmentsLeft > 0) {
    lines.push(`${assignmentsLeft} assignment${assignmentsLeft === 1 ? "" : "s"} remaining`);
  }
  if (
    enrollment.has_final_exam &&
    count(enrollment.topics_completed) === count(enrollment.topics_total) &&
    !enrollment.exam_passed
  ) {
    lines.push("Pass the final exam");
  }
  return lines;
}

function chipClass(tone: "success" | "warning" | "muted") {
  if (tone === "success") return "border-admin-success/40 bg-admin-success-soft text-admin-success";
  if (tone === "warning") return "border-caisbe-red/40 bg-caisbe-red/10 text-caisbe-red";
  return "border-ifma-border bg-admin-surface text-caisbe-muted";
}

function courseChipTone(label: string): "success" | "warning" | "muted" {
  if (label === "Completed") return "success";
  if (label === "Awaiting payment") return "warning";
  return "muted";
}

function examChipTone(label: string): "success" | "warning" | "muted" {
  if (label === "Passed" || label === "Eligible") return "success";
  if (label === "Not eligible") return "warning";
  return "muted";
}

function ProgressMeter({
  label,
  percent,
  detail,
  emphasis = false,
}: {
  label: string;
  percent: number | null;
  detail: string;
  emphasis?: boolean;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-semibold text-caisbe-text">{label}</span>
        <span className={emphasis ? "font-display text-lg font-semibold text-caisbe-text-dark" : "text-caisbe-muted"}>
          {detail}
        </span>
      </div>
      {percent != null ? (
        <div className={`mt-2 overflow-hidden rounded-full bg-admin-surface-muted ${emphasis ? "h-2.5" : "h-1.5"}`}>
          <div
            className="h-full bg-caisbe-red"
            style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}

function share(done: number, total: number) {
  if (total <= 0) return null;
  return Math.round((100 * done) / total);
}

export default function MyProgressSection({
  enrollments,
  showHeader = true,
}: {
  enrollments: Enrollment[];
  showHeader?: boolean;
}) {
  return (
    <Card>
      {showHeader ? (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">My Progress</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-caisbe-muted">
              Course progress, learning, assignments, exam eligibility, and certificates for each course.
            </p>
          </div>
          <Link href="/progress" className="text-sm font-semibold text-caisbe-red hover:underline">
            Open My Progress
          </Link>
        </div>
      ) : null}
      {enrollments.length === 0 ? (
        <p className={`${showHeader ? "mt-4" : ""} text-sm text-caisbe-muted`}>
          Enroll in a course to see your progress.{" "}
          <Link href="/courses" className="font-semibold text-caisbe-red hover:underline">
            Browse courses
          </Link>
        </p>
      ) : (
        <ul className={`${showHeader ? "mt-5" : ""} space-y-4`}>
          {enrollments.map((enrollment) => {
            const status = courseStatus(enrollment);
            const exam = examStatus(enrollment);
            const outstanding = outstandingLines(enrollment);
            const issued = Boolean(enrollment.certificate_code);
            const learning = share(
              count(enrollment.topics_completed) + count(enrollment.quizzes_completed),
              count(enrollment.topics_total) + count(enrollment.quizzes_total),
            );
            const learningDone = count(enrollment.topics_completed) + count(enrollment.quizzes_completed);
            const learningTotal = count(enrollment.topics_total) + count(enrollment.quizzes_total);
            const assignments = share(count(enrollment.assignments_completed), count(enrollment.assignments_total));
            const courseHref =
              enrollment.status === "pending_payment"
                ? `/courses/${enrollment.course.id}/checkout`
                : `/courses/${enrollment.course.id}`;
            const actionLabel = enrollment.status === "pending_payment" ? "Complete payment" : "Continue course";
            return (
              <li key={enrollment.id} className="rounded-[16px] border border-ifma-border-light px-4 py-5 sm:px-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/courses/${enrollment.course.id}`}
                      className="font-display text-lg font-semibold text-caisbe-text-dark hover:text-caisbe-red"
                    >
                      {enrollment.course.title}
                    </Link>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-caisbe-muted">
                      {enrollment.course.code}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${chipClass(courseChipTone(status))}`}
                  >
                    {status}
                  </span>
                </div>

                <div className="mt-5">
                  <ProgressMeter
                    label="Course progress"
                    percent={enrollment.progress}
                    detail={`${enrollment.progress}%`}
                    emphasis
                  />
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <ProgressMeter
                    label="Learning progress"
                    percent={learning}
                    detail={
                      learning == null ? "No topics or quizzes" : `${learning}% · ${learningDone} of ${learningTotal}`
                    }
                  />
                  <ProgressMeter
                    label="Assignment progress"
                    percent={assignments}
                    detail={
                      assignments == null
                        ? "No assignments"
                        : `${assignments}% · ${count(enrollment.assignments_completed)} of ${count(enrollment.assignments_total)}`
                    }
                  />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${chipClass(examChipTone(exam))}`}
                  >
                    <span className="font-medium uppercase tracking-wide opacity-80">Exam</span>
                    {exam}
                  </span>
                  {issued && enrollment.certificate_code ? (
                    <Link
                      href={`/certificates/${enrollment.certificate_code}`}
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${chipClass("success")}`}
                    >
                      <span className="font-medium uppercase tracking-wide opacity-80">Certificate</span>
                      Issued
                    </Link>
                  ) : (
                    <span
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${chipClass("muted")}`}
                    >
                      <span className="font-medium uppercase tracking-wide opacity-80">Certificate</span>
                      Under progress
                    </span>
                  )}
                </div>

                {outstanding.length > 0 ? (
                  <div className="mt-5 border-t border-ifma-border-light pt-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">
                      Outstanding requirements
                    </p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-caisbe-text">
                      {outstanding.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                    <Link
                      href={courseHref}
                      className="mt-4 inline-flex h-10 items-center rounded-full bg-caisbe-red px-4 text-sm font-bold text-white hover:bg-caisbe-red-dark"
                    >
                      {actionLabel}
                    </Link>
                  </div>
                ) : issued && enrollment.certificate_code ? (
                  <div className="mt-5 border-t border-ifma-border-light pt-4">
                    <Link
                      href={`/certificates/${enrollment.certificate_code}`}
                      className="inline-flex h-10 items-center rounded-full bg-caisbe-red px-4 text-sm font-bold text-white hover:bg-caisbe-red-dark"
                    >
                      View certificate
                    </Link>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
