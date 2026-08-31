"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/auth";
import type { IssuedCertificate } from "@/lib/lms";

type IssuedCertificatesTableProps = {
  courseId: number;
};

export default function IssuedCertificatesTable({ courseId }: IssuedCertificatesTableProps) {
  const [rows, setRows] = useState<IssuedCertificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<IssuedCertificate[]>(`/admin/courses/${courseId}/certificates`);
      setRows(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to load issued certificates.");
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-caisbe-text">Issued certificates</h3>
        <button
          type="button"
          onClick={() => void load()}
          className="text-xs font-medium text-caisbe-green hover:underline"
        >
          Refresh
        </button>
      </div>
      <p className="text-xs text-caisbe-muted">
        Every certificate earned for this course is stored in the database with a unique verification code.
      </p>

      {loading ? (
        <p className="text-sm text-caisbe-muted">Loading issued certificates…</p>
      ) : error ? (
        <p className="text-sm text-caisbe-red">{error}</p>
      ) : rows.length === 0 ? (
        <p className="rounded-md border border-dashed border-ifma-border bg-[#fafaf8] px-4 py-6 text-center text-sm text-caisbe-muted">
          No certificates issued yet for this course.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-ifma-border">
          <table className="min-w-full divide-y divide-ifma-border text-left text-sm">
            <thead className="bg-[#fafaf8]">
              <tr>
                <th className="px-4 py-2.5 font-semibold text-caisbe-text">Student</th>
                <th className="px-4 py-2.5 font-semibold text-caisbe-text">Certificate ID</th>
                <th className="px-4 py-2.5 font-semibold text-caisbe-text">Issued</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ifma-border bg-white">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-caisbe-text">{row.student_name}</p>
                    <p className="text-xs text-caisbe-muted">{row.student_email}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-caisbe-text">{row.certificate_code}</td>
                  <td className="px-4 py-3 text-caisbe-muted">
                    {new Date(row.issued_at).toLocaleDateString(undefined, { dateStyle: "medium" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
