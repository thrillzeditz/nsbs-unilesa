'use client';

/**
 * StudentRegistryTab — Permanent Student Voter Registry UI
 *
 * Features:
 *  - View, search, and paginate the student_voter_registry table
 *  - Toggle active / inactive per student
 *  - CSV file upload → preview → validate → import → summary
 *  - "Seed from Demo Data" (loads the 264 MOCK_STUDENTS in one click)
 *  - "Add All Active to Election" (assigns entire registry to a chosen election)
 *
 * RLS note: super_admin write, any_admin read.
 * This component NEVER modifies election_voters directly — it calls db helpers.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users, Upload, Search, ChevronLeft, ChevronRight, Check,
  X, AlertCircle, Download, Database, RefreshCw, UserCheck, UserX,
  CheckCircle2, Info, Loader2, FileText
} from 'lucide-react';
import {
  searchStudentRegistry,
  getRegistrySummary,
  importStudentsToRegistry,
  toggleRegistryStudentActive,
  seedRegistryFromMockStudents,
  addAllRegistryToElection,
} from '@/lib/db';
import { MOCK_STUDENTS } from '@/lib/electionDemoData';
import { StudentVoterRegistry, RegistryImportResult } from '@/lib/types';
import { Election } from '@/lib/types';

interface Props {
  elections: Election[];
  isSuperAdmin: boolean;
}

type ImportStep = 'idle' | 'preview' | 'importing' | 'done';

interface ParsedRow {
  row: number;
  matric_number: string;
  full_name: string;
  level: string;
  department: string;
  valid: boolean;
  issue?: string;
}

const PAGE_SIZE = 50;

// ── CSV parser (no dependency) ──────────────────────────────────────────────
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let cur = '';
  let inQuotes = false;
  const fields: string[] = [];

  const pushField = () => { fields.push(cur.trim()); cur = ''; };
  const pushRow = () => { pushField(); if (fields.some(f => f)) rows.push([...fields]); fields.length = 0; };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      pushField();
    } else if ((ch === '\n' || (ch === '\r' && text[i + 1] === '\n')) && !inQuotes) {
      if (ch === '\r') i++;
      pushRow();
    } else {
      cur += ch;
    }
  }
  pushRow();
  return rows.filter(r => r.length > 0);
}

// ── Matric-number format validator ─────────────────────────────────────────
function isValidMatric(m: string): boolean {
  // Accepts: YYYY/NNNN or YYYY/NNNNN (4-digit year, slash, 3-5 digits)
  return /^\d{4}\/\d{3,5}$/.test(m.replace(/\s/g, '').toUpperCase());
}

export default function StudentRegistryTab({ elections, isSuperAdmin }: Props) {
  // ── List state ───────────────────────────────────────────────────────────
  const [students, setStudents] = useState<StudentVoterRegistry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [summaryTotal, setSummaryTotal] = useState(0);
  const [summaryActive, setSummaryActive] = useState(0);

  // ── Import state ─────────────────────────────────────────────────────────
  const [showImportModal, setShowImportModal] = useState(false);
  const [importStep, setImportStep] = useState<ImportStep>('idle');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [importResult, setImportResult] = useState<RegistryImportResult | null>(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Assign-to-election state ─────────────────────────────────────────────
  const [assignElectionId, setAssignElectionId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [assignResult, setAssignResult] = useState<string | null>(null);

  // ── Seeding state ────────────────────────────────────────────────────────
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<string | null>(null);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async (resetPage = false) => {
    setLoading(true);
    try {
      const p = resetPage ? 0 : page;
      if (resetPage) setPage(0);
      const [listResult, summary] = await Promise.all([
        searchStudentRegistry(query, p, PAGE_SIZE),
        getRegistrySummary(),
      ]);
      setStudents(listResult.data);
      setTotal(listResult.total);
      setSummaryTotal(summary.total);
      setSummaryActive(summary.active);
    } catch (err) {
      console.error('Registry fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [query, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── File upload handler ───────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rawRows = parseCSV(text);
      if (rawRows.length < 2) {
        alert('CSV appears empty or has no data rows.');
        return;
      }

      // Auto-detect columns
      const headers = rawRows[0].map(h => h.toLowerCase().trim());
      const matricIdx = headers.findIndex(h =>
        h.includes('matric') || h.includes('number') || h === 'id'
      );
      const nameIdx = headers.findIndex(h =>
        h.includes('name') || h === 'full_name' || h === 'student'
      );
      const levelIdx = headers.findIndex(h =>
        h.includes('level') || h.includes('year')
      );
      const deptIdx = headers.findIndex(h =>
        h.includes('dept') || h.includes('department')
      );

      if (matricIdx === -1 || nameIdx === -1) {
        alert(
          `Could not find required columns.\n\n` +
          `Detected headers: ${headers.join(', ')}\n\n` +
          `Your CSV must have columns for matric number and student name. ` +
          `Rename them to "matric_number" and "full_name" (or similar).`
        );
        return;
      }

      const dataRows = rawRows.slice(1);
      const parsed: ParsedRow[] = dataRows
        .filter(r => r.some(c => c.trim()))
        .map((r, i) => {
          const matric = (r[matricIdx] || '').trim().toUpperCase().replace(/\s/g, '');
          const name = (r[nameIdx] || '').trim().toUpperCase();
          const level = levelIdx >= 0 ? (r[levelIdx] || '').trim() : '';
          const dept = deptIdx >= 0 ? (r[deptIdx] || '').trim() : 'Biochemistry';

          let valid = true;
          let issue = '';

          if (!matric) { valid = false; issue = 'Missing matric number'; }
          else if (!name) { valid = false; issue = 'Missing student name'; }
          else if (!isValidMatric(matric)) { valid = false; issue = `Invalid format: ${matric}`; }

          return { row: i + 2, matric_number: matric, full_name: name, level, department: dept || 'Biochemistry', valid, issue };
        });

      setParsedRows(parsed);
      setImportStep('preview');
      setShowImportModal(true);
    };
    reader.readAsText(file);
    // Reset so user can re-upload same file
    e.target.value = '';
  };

  // ── Confirm import ────────────────────────────────────────────────────────
  const handleConfirmImport = async () => {
    setImporting(true);
    setImportStep('importing');
    try {
      const validRows = parsedRows
        .filter(r => r.valid)
        .map(r => ({
          matric_number: r.matric_number,
          full_name: r.full_name,
          level: r.level || undefined,
          department: r.department || 'Biochemistry',
        }));

      const result = await importStudentsToRegistry(validRows);
      setImportResult(result);
      setImportStep('done');
      fetchData(true);
    } catch (err: unknown) {
      alert(`Import failed: ${err instanceof Error ? err.message : String(err)}`);
      setImportStep('preview');
    } finally {
      setImporting(false);
    }
  };

  const closeImportModal = () => {
    setShowImportModal(false);
    setImportStep('idle');
    setParsedRows([]);
    setImportResult(null);
  };

  // ── Error report download ─────────────────────────────────────────────────
  const downloadErrorReport = () => {
    if (!importResult) return;
    const lines = ['Row,Matric,Name,Reason', ...importResult.errors.map(e =>
      `${e.row},"${e.matric}","${e.name}","${e.reason}"`
    )].join('\r\n');
    const blob = new Blob([lines], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'import_errors.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Seed from MOCK_STUDENTS ───────────────────────────────────────────────
  const handleSeedFromDemo = async () => {
    if (!confirm(
      `This will upsert all ${MOCK_STUDENTS.length} demo student records into the registry.\n\n` +
      `Existing records with matching matric numbers will be updated. Continue?`
    )) return;

    setSeeding(true);
    setSeedResult(null);
    try {
      const result = await seedRegistryFromMockStudents(MOCK_STUDENTS);

      if (result.imported > 0) {
        setSeedResult(`✓ Done — ${result.imported} students successfully saved to the voter registry.`);
        fetchData(true);
      } else {
        const reason = result.errors[0]?.reason || 'Database operation was rejected.';
        setSeedResult(
          `✗ Seeding failed: ${reason}. ` +
          `Please ensure the updated student_voter_registry migration has been executed in the Supabase SQL Editor.`
        );
      }
    } catch (err: unknown) {
      setSeedResult(`✗ Failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSeeding(false);
    }
  };

  // ── Assign all to election ────────────────────────────────────────────────
  const handleAssignToElection = async () => {
    if (!assignElectionId) { alert('Please select an election first.'); return; }
    if (!confirm(
      `This will assign all ${summaryActive} active registry students to the selected election.\n\n` +
      `Students already on the roster will be skipped. Continue?`
    )) return;

    setAssigning(true);
    setAssignResult(null);
    try {
      const count = await addAllRegistryToElection(assignElectionId);
      setAssignResult(`✓ ${count} students added to the election roster.`);
    } catch (err: unknown) {
      setAssignResult(`✗ Failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setAssigning(false);
    }
  };

  // ── Toggle active ────────────────────────────────────────────────────────
  const handleToggleActive = async (id: string, current: boolean) => {
    try {
      await toggleRegistryStudentActive(id, !current);
      setStudents(prev => prev.map(s => s.id === id ? { ...s, is_active: !current } : s));
    } catch (err: unknown) {
      alert(`Failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const validCount = parsedRows.filter(r => r.valid).length;
  const invalidCount = parsedRows.filter(r => !r.valid).length;

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-500" />
            Student Voter Registry
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Permanent centralised student database. {summaryTotal} total · {summaryActive} active.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => fetchData()}
            disabled={loading}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          {isSuperAdmin && (
            <>
              <button
                onClick={handleSeedFromDemo}
                disabled={seeding}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
              >
                {seeding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
                Seed 264 Students
              </button>

              <button
                onClick={() => fileRef.current?.click()}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                Import CSV
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </>
          )}
        </div>
      </div>

      {/* ── Seed result banner ───────────────────────────────────────────── */}
      {seedResult && (
        <div className={`text-xs px-4 py-2 rounded-xl font-medium ${seedResult.startsWith('✓') ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {seedResult}
        </div>
      )}

      {/* ── Assign-to-election bar ───────────────────────────────────────── */}
      {isSuperAdmin && elections.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="flex-1">
            <p className="text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-emerald-500" />
              Assign entire registry to an election
            </p>
            <p className="text-[11px] text-slate-500">
              Adds all {summaryActive} active students to the selected election's voter roster (skips existing entries).
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <select
              value={assignElectionId}
              onChange={e => setAssignElectionId(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 min-w-[180px]"
            >
              <option value="">— Select election —</option>
              {elections.map(el => (
                <option key={el.id} value={el.id}>{el.title}</option>
              ))}
            </select>
            <button
              onClick={handleAssignToElection}
              disabled={assigning || !assignElectionId}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              {assigning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
              Assign All
            </button>
          </div>
          {assignResult && (
            <p className={`text-xs font-semibold ${assignResult.startsWith('✓') ? 'text-emerald-700' : 'text-red-600'}`}>
              {assignResult}
            </p>
          )}
        </div>
      )}

      {/* ── Search + pagination ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setPage(0); }}
            placeholder="Search by name or matric number…"
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>{total} result{total !== 1 ? 's' : ''}</span>
          {totalPages > 1 && (
            <>
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0 || loading}
                className="p-1 rounded-lg hover:bg-slate-100 disabled:opacity-30 cursor-pointer">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span>pg {page + 1}/{totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1 || loading}
                className="p-1 rounded-lg hover:bg-slate-100 disabled:opacity-30 cursor-pointer">
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-left">
              <th className="px-3 py-2.5 font-bold text-slate-600">Matric No.</th>
              <th className="px-3 py-2.5 font-bold text-slate-600">Full Name</th>
              <th className="px-3 py-2.5 font-bold text-slate-600 hidden sm:table-cell">Level</th>
              <th className="px-3 py-2.5 font-bold text-slate-600 hidden md:table-cell">Department</th>
              <th className="px-3 py-2.5 font-bold text-slate-600">Status</th>
              {isSuperAdmin && <th className="px-3 py-2.5 font-bold text-slate-600 text-right">Action</th>}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1" />
                  Loading…
                </td>
              </tr>
            )}
            {!loading && students.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-slate-400">
                  {query ? 'No students match your search.' : 'Registry is empty. Import students to get started.'}
                </td>
              </tr>
            )}
            {!loading && students.map(s => (
              <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <td className="px-3 py-2 font-mono text-slate-700 font-semibold">{s.matric_number}</td>
                <td className="px-3 py-2 text-slate-800">{s.full_name}</td>
                <td className="px-3 py-2 text-slate-500 hidden sm:table-cell">{s.level || '—'}</td>
                <td className="px-3 py-2 text-slate-500 hidden md:table-cell">{s.department}</td>
                <td className="px-3 py-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${s.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {s.is_active ? <><Check className="w-2.5 h-2.5" />Active</> : <>Inactive</>}
                  </span>
                </td>
                {isSuperAdmin && (
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => handleToggleActive(s.id, s.is_active)}
                      title={s.is_active ? 'Deactivate' : 'Activate'}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                    >
                      {s.is_active ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Import Modal ─────────────────────────────────────────────────── */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">

            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <Upload className="w-4 h-4 text-emerald-500" />
                {importStep === 'idle' && 'Import Students from CSV'}
                {importStep === 'preview' && `CSV Preview — ${parsedRows.length} rows detected`}
                {importStep === 'importing' && 'Importing…'}
                {importStep === 'done' && 'Import Complete'}
              </h4>
              <button onClick={closeImportModal} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">

              {/* PREVIEW step */}
              {importStep === 'preview' && (
                <>
                  {/* Stats bar */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                      <div className="text-lg font-extrabold text-emerald-700">{validCount}</div>
                      <div className="text-[10px] text-emerald-600 font-bold uppercase">Valid rows</div>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
                      <div className="text-lg font-extrabold text-red-700">{invalidCount}</div>
                      <div className="text-[10px] text-red-600 font-bold uppercase">Invalid rows</div>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                      <div className="text-lg font-extrabold text-slate-700">{parsedRows.length}</div>
                      <div className="text-[10px] text-slate-500 font-bold uppercase">Total rows</div>
                    </div>
                  </div>

                  {invalidCount > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2 text-xs text-amber-800">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{invalidCount} invalid row{invalidCount !== 1 ? 's' : ''} will be skipped. Only the {validCount} valid rows will be imported. Download the error report after import.</span>
                    </div>
                  )}

                  {/* Preview table */}
                  <div className="overflow-x-auto rounded-xl border border-slate-200 max-h-64">
                    <table className="w-full text-[11px]">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-2 py-1.5 text-left font-bold text-slate-500">#</th>
                          <th className="px-2 py-1.5 text-left font-bold text-slate-500">Matric</th>
                          <th className="px-2 py-1.5 text-left font-bold text-slate-500">Name</th>
                          <th className="px-2 py-1.5 text-left font-bold text-slate-500">Level</th>
                          <th className="px-2 py-1.5 text-left font-bold text-slate-500">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedRows.slice(0, 20).map(r => (
                          <tr key={r.row} className={`border-b border-slate-100 ${r.valid ? '' : 'bg-red-50'}`}>
                            <td className="px-2 py-1.5 text-slate-400">{r.row}</td>
                            <td className="px-2 py-1.5 font-mono text-slate-700">{r.matric_number || '—'}</td>
                            <td className="px-2 py-1.5 text-slate-800">{r.full_name || '—'}</td>
                            <td className="px-2 py-1.5 text-slate-500">{r.level || '—'}</td>
                            <td className="px-2 py-1.5">
                              {r.valid
                                ? <span className="text-emerald-600 font-bold flex items-center gap-0.5"><Check className="w-3 h-3" />OK</span>
                                : <span className="text-red-600 font-bold flex items-center gap-0.5"><X className="w-3 h-3" />{r.issue}</span>
                              }
                            </td>
                          </tr>
                        ))}
                        {parsedRows.length > 20 && (
                          <tr>
                            <td colSpan={5} className="px-2 py-2 text-center text-slate-400 italic">
                              …and {parsedRows.length - 20} more rows
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {/* IMPORTING step */}
              {importStep === 'importing' && (
                <div className="flex flex-col items-center py-8 gap-4">
                  <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
                  <p className="text-sm text-slate-600 font-semibold">Importing {validCount} students…</p>
                  <p className="text-xs text-slate-400">This may take a few seconds.</p>
                </div>
              )}

              {/* DONE step */}
              {importStep === 'done' && importResult && (
                <div className="space-y-4">
                  <div className="flex flex-col items-center py-4 gap-2">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                    <p className="text-sm font-extrabold text-slate-800">Import Complete</p>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                      <div className="text-xl font-extrabold text-emerald-700">{importResult.imported}</div>
                      <div className="text-[10px] text-emerald-600 font-bold uppercase">Imported</div>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
                      <div className="text-xl font-extrabold text-amber-700">{importResult.skipped_duplicate}</div>
                      <div className="text-[10px] text-amber-600 font-bold uppercase">Duplicates</div>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
                      <div className="text-xl font-extrabold text-red-700">{importResult.skipped_invalid}</div>
                      <div className="text-[10px] text-red-600 font-bold uppercase">Invalid</div>
                    </div>
                  </div>

                  {importResult.errors.length > 0 && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-slate-700">
                        <Info className="w-4 h-4 text-slate-400" />
                        {importResult.errors.length} row{importResult.errors.length !== 1 ? 's' : ''} had issues.
                      </div>
                      <button
                        onClick={downloadErrorReport}
                        className="px-3 py-1.5 bg-slate-800 text-white font-bold text-[11px] rounded-lg flex items-center gap-1 cursor-pointer hover:bg-slate-700"
                      >
                        <Download className="w-3 h-3" />
                        Error Report CSV
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-100 px-6 py-4 flex justify-end gap-2">
              {importStep === 'preview' && (
                <>
                  <button
                    onClick={closeImportModal}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmImport}
                    disabled={validCount === 0 || importing}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    Import {validCount} Valid Student{validCount !== 1 ? 's' : ''}
                  </button>
                </>
              )}
              {importStep === 'done' && (
                <button
                  onClick={closeImportModal}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl cursor-pointer"
                >
                  Close
                </button>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
