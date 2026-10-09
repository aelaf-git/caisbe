import Link from "next/link";
import Card from "@/components/ui/Card";
import type { Enrollment } from "@/lib/auth";

function count(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function countProgress(done: number, total: number) {
  if (total <= 0) return "None in this course";
  const percent = Math.round((100 * done) / total);
  return `${percent}% (${done} of ${total})`;
}

function examStatus(enrollment: Enrollment) {
  if (!enrollment.has_final_exam) return "No exam";
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
            const exam = examStatus(enrollment);
            const outstanding = outstandingLines(enrollment);
            const issued = Boolean(enrollment.certificate_code);
            const topicsDone = count(enrollment.topics_completed);
            const topicsTotal = count(enrollment.topics_total);
            const quizzesDone = count(enrollment.quizzes_completed);
            const quizzesTotal = count(enrollment.quizzes_total);
            const assignmentsDone = count(enrollment.assignments_completed);
            const assignmentsTotal = count(enrollment.assignments_total);
            return (
              <li key={enrollment.id} className="rounded-md border border-ifma-border-light px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <Link
                    href={`/courses/${enrollment.course.id}`}
                    className="font-display text-base font-semibold text-caisbe-text-dark hover:text-caisbe-red"
                  >
                    {enrollment.course.title}
                  </Link>
                  <span className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">
                    {enrollment.course.code}
                  </span>
                </div>
                <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">Course progress</dt>
                    <dd className="mt-1 text-sm font-semibold text-caisbe-text">{enrollment.progress}%</dd>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-admin-surface-muted">
                      <div
                        className="h-full bg-caisbe-red"
                        style={{ width: `${Math.min(100, Math.max(0, enrollment.progress))}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">Learning progress</dt>
                    <dd className="mt-1 text-sm font-semibold text-caisbe-text">
                      {countProgress(topicsDone + quizzesDone, topicsTotal + quizzesTotal)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">Assignment progress</dt>
                    <dd className="mt-1 text-sm font-semibold text-caisbe-text">
                      {countProgress(assignmentsDone, assignmentsTotal)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">Exam status</dt>
                    <dd
                      className={`mt-1 text-sm font-semibold ${
                        exam === "Eligible"
                          ? "text-admin-success"
                          : exam === "Not eligible"
                            ? "text-caisbe-red"
                            : "text-caisbe-muted"
                      }`}
                    >
                      {exam}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">
                      Outstanding requirements
                    </dt>
                    <dd className="mt-1 text-sm text-caisbe-text">
                      {outstanding.length === 0 ? (
                        "None"
                      ) : (
                        <ul className="space-y-1">
                          {outstanding.map((line) => (
                            <li key={line}>{line}</li>
                          ))}
                        </ul>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">
                      Certification status
                    </dt>
                    <dd className={`mt-1 text-sm font-semibold ${issued ? "text-admin-success" : "text-caisbe-text"}`}>
                      {issued ? "Issued" : "Under progress"}
                    </dd>
                  </div>
                </dl>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
