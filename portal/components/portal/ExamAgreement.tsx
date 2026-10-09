"use client";

import { useState } from "react";

export type ExamAgreementFacts = {
  timeLabel: string;
  passPercent: number;
  questionCount: number;
  secureMode: boolean;
  maxViolations: number;
};

const QUESTION_TYPES = [
  "Multiple-choice questions",
  "Knowledge-based questions",
  "Scenario-based questions",
  "Practical application questions",
  "Calculations or problem-solving questions, where applicable",
];

const WORKSPACE_STEPS = [
  "Find a quiet location.",
  "Turn off unnecessary notifications.",
  "Close unrelated applications and browser tabs.",
  "Ensure your computer is adequately charged or connected to power.",
  "Ensure you have a stable internet connection.",
  "Remove unauthorized materials from your workspace.",
  "Make sure you will not be interrupted during the examination.",
];

const FORBIDDEN_MATERIALS = [
  "Course notes",
  "Textbooks",
  "Websites",
  "Search engines",
  "Messaging applications",
  "Mobile phones",
  "Smart watches",
  "Artificial intelligence tools",
  "Other people's assistance",
  "Unauthorized calculators or software",
];

const CONDUCT = [
  "Honesty",
  "Integrity",
  "Respect",
  "Professional responsibility",
  "Fair dealing",
  "Respect for confidentiality",
  "Respect for other learners and CAISBE staff",
];

function AgreeBox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-start gap-3 rounded-md border border-ifma-border bg-admin-surface px-4 py-3 text-sm text-caisbe-text">
      <input
        type="checkbox"
        className="mt-1"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>
        <span className="block text-xs font-semibold uppercase tracking-wide text-caisbe-text-dark">
          I agree to the CAISBE examination terms and conditions
        </span>
        <span className="mt-1 block">{label}</span>
      </span>
    </label>
  );
}

function MaterialsBlock() {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-caisbe-text-dark">Examination materials and technology</h3>
      <p className="text-sm leading-6 text-caisbe-text">
        Unless the examination instructions specifically permit them, students must not use:
      </p>
      <ul className="list-disc space-y-1 pl-5 text-sm leading-6 text-caisbe-text">
        {FORBIDDEN_MATERIALS.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <h3 className="text-sm font-semibold text-caisbe-text-dark">Permitted materials</h3>
      <p className="text-sm leading-6 text-caisbe-text">
        If an examination is open book or permits specific reference materials, CAISBE will clearly
        identify those materials before the examination begins. No notes, websites, phones, or other
        aids are permitted unless CAISBE has identified them for this exam.
      </p>
    </div>
  );
}

export default function ExamAgreement({
  facts,
  starting,
  onComplete,
}: {
  facts: ExamAgreementFacts;
  starting: boolean;
  onComplete: () => void;
}) {
  const [step, setStep] = useState(0);
  const [agreed, setAgreed] = useState([false, false, false]);

  function setAgree(index: number, value: boolean) {
    setAgreed((current) => current.map((item, itemIndex) => (itemIndex === index ? value : item)));
  }

  const attempts = facts.secureMode
    ? `You may retake this exam if you do not pass. A secure exam can lock the current attempt after ${facts.maxViolations} integrity violations.`
    : "You may retake this exam if you do not pass. There is no separate attempt limit.";
  const proctoring = facts.secureMode
    ? "Camera presence check and fullscreen are required before the timer starts. The camera check does not record the exam."
    : "This exam does not require a camera check.";

  return (
    <div className="space-y-4 rounded-md border border-ifma-border bg-[#fafaf8] px-4 py-4 sm:px-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">
        Screen {step + 1} of 3
      </p>

      {step === 0 ? (
        <div className="space-y-3">
          <h3 className="font-display text-lg font-semibold text-caisbe-text-dark">Exam information</h3>
          <p className="text-sm leading-6 text-caisbe-text">
            The CAISBE examination is designed to assess your understanding and application of the
            knowledge presented in your course.
          </p>
          <p className="text-sm leading-6 text-caisbe-text">Depending on the course, the examination may include:</p>
          <ul className="list-disc space-y-1 pl-5 text-sm leading-6 text-caisbe-text">
            {QUESTION_TYPES.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="text-sm leading-6 text-caisbe-text">The examination instructions identify:</p>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            {[
              ["Number of questions", String(facts.questionCount)],
              ["Examination time limit", facts.timeLabel],
              ["Passing grade", `${facts.passPercent}%`],
              ["Permitted materials", "None unless CAISBE identifies them for this exam"],
              ["Number of attempts", attempts],
              ["Examination delivery method", "Online in myCAISBE"],
              ["Proctoring or identity verification", proctoring],
            ].map(([label, value]) => (
              <div key={label} className="rounded-md border border-ifma-border bg-admin-surface px-3 py-2">
                <dt className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">{label}</dt>
                <dd className="mt-1 leading-5 text-caisbe-text">{value}</dd>
              </div>
            ))}
          </dl>
          <AgreeBox
            checked={agreed[0]}
            onChange={(value) => setAgree(0, value)}
            label="I agree"
          />
        </div>
      ) : null}

      {step === 1 ? (
        <div className="space-y-3">
          <h3 className="font-display text-lg font-semibold text-caisbe-text-dark">
            Exam rules and academic integrity
          </h3>
          <p className="text-sm leading-6 text-caisbe-text">
            The examination time limit is displayed before you begin. You are responsible for managing
            your examination time.
          </p>
          <dl className="grid gap-2 text-sm sm:grid-cols-3">
            {[
              ["Examination time", facts.timeLabel],
              ["Passing grade", `${facts.passPercent}%`],
              ["Questions", String(facts.questionCount)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-md border border-ifma-border bg-admin-surface px-3 py-2">
                <dt className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">{label}</dt>
                <dd className="mt-1 font-semibold text-caisbe-text-dark">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="text-sm leading-6 text-caisbe-text">
            The actual examination time, number of questions, and passing grade may vary by CAISBE
            course. Once the examination starts, the timer may begin immediately.
          </p>
          <p className="text-sm leading-6 text-caisbe-text">
            Students are expected to complete examinations in an appropriate environment. Before starting:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm leading-6 text-caisbe-text">
            {WORKSPACE_STEPS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <h3 className="text-sm font-semibold text-caisbe-text-dark">Identity and account security</h3>
          <p className="text-sm leading-6 text-caisbe-text">
            You must take the examination using your own CAISBE account. You must not:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm leading-6 text-caisbe-text">
            <li>Allow another person to use your account.</li>
            <li>Allow another person to take your examination.</li>
            <li>Take an examination on behalf of another student.</li>
            <li>Share your password or examination login information.</li>
          </ul>
          <p className="text-sm leading-6 text-caisbe-text">
            CAISBE may require identity verification for selected examinations. {proctoring}
          </p>
          <MaterialsBlock />
          <AgreeBox
            checked={agreed[1]}
            onChange={(value) => setAgree(1, value)}
            label="I agree"
          />
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-3">
          <h3 className="font-display text-lg font-semibold text-caisbe-text-dark">
            Confidentiality and professional conduct
          </h3>
          <MaterialsBlock />
          <h3 className="text-sm font-semibold text-caisbe-text-dark">Professional conduct</h3>
          <p className="text-sm leading-6 text-caisbe-text">
            CAISBE examinations are part of professional education. Students are expected to demonstrate:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm leading-6 text-caisbe-text">
            {CONDUCT.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="text-sm leading-6 text-caisbe-text">
            CAISBE expects learners preparing for professional careers in facilities management, property
            management, real estate, sustainability, and the built environment to maintain appropriate
            professional standards.
          </p>
          <h3 className="text-sm font-semibold text-caisbe-text-dark">Technical problems during the exam</h3>
          <p className="text-sm font-semibold text-caisbe-text">Do:</p>
          <ul className="list-disc space-y-1 pl-5 text-sm leading-6 text-caisbe-text">
            <li>Follow the instructions displayed by the examination system.</li>
            <li>If possible, document the problem.</li>
            <li>Contact CAISBE examination support as soon as possible.</li>
            <li>Provide your name, course, examination, and a description of the problem.</li>
          </ul>
          <p className="text-sm font-semibold text-caisbe-text">Do not:</p>
          <ul className="list-disc space-y-1 pl-5 text-sm leading-6 text-caisbe-text">
            <li>Attempt to manipulate the examination system.</li>
            <li>Ask another person to continue the examination for you.</li>
            <li>
              Share examination questions with technical support unless specifically requested through an
              approved secure process.
            </li>
            <li>Repeatedly refresh or close the examination window unless instructed to do so.</li>
          </ul>
          <p className="text-sm leading-6 text-caisbe-text">
            CAISBE may review the examination record and determine whether an interrupted examination can
            be resumed or whether another examination attempt is required.
          </p>
          <h3 className="text-sm font-semibold text-caisbe-text-dark">Accessibility and special accommodations</h3>
          <p className="text-sm leading-6 text-caisbe-text">
            CAISBE is committed to providing reasonable accessibility and examination accommodations. If
            you require accommodation, contact the CAISBE team before starting the examination.
            Depending on the circumstances, accommodation may include adjustments to examination time,
            format, accessibility technology, the examination environment, or other approved arrangements.
            Request accommodations in advance so arrangements can be made.
          </p>
          <AgreeBox
            checked={agreed[2]}
            onChange={(value) => setAgree(2, value)}
            label="I have read and agree to the CAISBE Examination Terms and Conditions, Academic Integrity, and Examination Confidentiality requirements."
          />
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {step > 0 ? (
          <button
            type="button"
            onClick={() => setStep((current) => current - 1)}
            className="rounded-md border-2 border-ifma-border bg-admin-surface px-5 py-2 text-sm font-semibold uppercase text-caisbe-text-dark hover:border-caisbe-red/40"
          >
            Back
          </button>
        ) : null}
        {step < 2 ? (
          <button
            type="button"
            disabled={!agreed[step]}
            onClick={() => setStep((current) => current + 1)}
            className="rounded-md border-2 border-caisbe-red bg-caisbe-red px-6 py-2.5 text-sm font-semibold uppercase text-white hover:bg-caisbe-red-dark disabled:opacity-60"
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            disabled={!agreed[2] || starting}
            onClick={onComplete}
            className="rounded-md border-2 border-caisbe-red bg-caisbe-red px-6 py-2.5 text-sm font-semibold uppercase text-white hover:bg-caisbe-red-dark disabled:opacity-60"
          >
            {starting ? "Starting…" : "Agree & start exam"}
          </button>
        )}
      </div>
    </div>
  );
}
