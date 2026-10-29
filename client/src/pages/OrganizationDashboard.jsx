import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { useAuth } from '../context/AuthContext';
import {
  Building2,
  Users,
  UserPlus,
  ShieldCheck,
  Mail,
  MapPin,
  Globe,
  Phone,
  CheckCircle2,
  Loader2,
  AlertCircle,
  X,
  Eye,
  EyeOff,
  FileSpreadsheet,
  Download,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  Check,
  Lock,
  User,
} from 'lucide-react';

export default function OrganizationDashboard() {
  const { user, organization, membership } = useAuth();

  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [membersError, setMembersError] = useState(null);

  // Search & Pagination State
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Add Member Modal State (Single Add)
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addFullName, setAddFullName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addPassword, setAddPassword] = useState('Sjcet@123#');
  const [showPassword, setShowPassword] = useState(false);
  const [addRole, setAddRole] = useState('MEMBER');
  const [addLoading, setAddLoading] = useState(false);
  const [addSuccess, setAddSuccess] = useState(null);
  const [addError, setAddError] = useState(null);

  // Excel Bulk Upload State
  const fileInputRef = useRef(null);
  const [excelModalOpen, setExcelModalOpen] = useState(false);
  const [excelRows, setExcelRows] = useState([]);
  const [excelFilter, setExcelFilter] = useState('all'); // 'all', 'valid', 'invalid'
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ processed: 0, total: 0 });

  // Summary Modal State
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [summaryData, setSummaryData] = useState({ total: 0, added: [], skipped: [], failed: [] });

  // Fetch Organization Members
  const fetchMembers = async () => {
    try {
      setLoadingMembers(true);
      const res = await fetch('/api/organizations/my/members', {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error('Failed to fetch organization team members');
      }

      const data = await res.json();
      setMembers(data.members || []);
      setMembersError(null);
    } catch (err) {
      setMembersError(err.message);
    } finally {
      setLoadingMembers(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  // Filtered members based on live search
  const filteredMembers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return members;
    return members.filter(
      (m) =>
        (m.full_name && m.full_name.toLowerCase().includes(q)) ||
        (m.email && m.email.toLowerCase().includes(q)) ||
        (m.role && m.role.toLowerCase().includes(q))
    );
  }, [members, searchQuery]);

  // Paginated members
  const totalPages = Math.ceil(filteredMembers.length / pageSize) || 1;
  const paginatedMembers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredMembers.slice(start, start + pageSize);
  }, [filteredMembers, currentPage, pageSize]);

  // Handle single member manual submit
  const handleManualAddSubmit = async (e) => {
    e.preventDefault();
    setAddError(null);
    setAddSuccess(null);

    if (!addEmail) {
      setAddError('Please enter an email address.');
      return;
    }

    if (addPassword && addPassword.length < 6) {
      setAddError('Password must be at least 6 characters.');
      return;
    }

    try {
      setAddLoading(true);
      const res = await fetch('/api/organizations/my/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: addEmail,
          fullName: addFullName,
          password: addPassword || 'Sjcet@123#',
          role: addRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to add member');
      }

      setAddSuccess(`Member ${addEmail} successfully added to organization!`);
      setAddEmail('');
      setAddFullName('');
      setAddPassword('Sjcet@123#');
      await fetchMembers();

      setTimeout(() => {
        setAddSuccess(null);
        setAddModalOpen(false);
      }, 1600);
    } catch (err) {
      setAddError(err.message);
    } finally {
      setAddLoading(false);
    }
  };

  // Trigger Excel file selection
  const handleTriggerExcel = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  // Download Sample Excel Template
  const handleDownloadSample = () => {
    const sampleData = [
      { 'Full Name': 'Alex Johnson', 'Email': 'alex.j@example.com', 'Password': 'Sjcet@123#' },
      { 'Full Name': 'Priya Sharma', 'Email': 'priya.s@example.com', 'Password': '' },
      { 'Full Name': 'David Miller', 'Email': 'david.m@example.com', 'Password': 'Sjcet@123#' },
    ];
    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Members Template');
    XLSX.writeFile(wb, 'terra_members_template.xlsx');
  };

  // Parse Excel / CSV File client-side
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          alert('The selected file has no data rows.');
          return;
        }

        const existingEmails = new Set(members.map((m) => m.email?.toLowerCase().trim()));
        const fileEmailsSeen = new Set();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        const parsed = rawJson.map((row, idx) => {
          let fullName = '';
          let email = '';
          let password = '';

          // Case-insensitive header match
          for (const [key, val] of Object.entries(row)) {
            const k = key.trim().toLowerCase();
            if (['full name', 'fullname', 'name', 'full_name', 'member name'].includes(k)) {
              fullName = String(val).trim();
            } else if (['email', 'email address', 'mail', 'e-mail'].includes(k)) {
              email = String(val).trim().toLowerCase();
            } else if (['password', 'pass', 'pwd', 'initial password'].includes(k)) {
              password = String(val).trim();
            }
          }

          if (!password) {
            password = 'Sjcet@123#';
          }

          let error = null;
          if (!email) {
            error = 'Missing email';
          } else if (!emailRegex.test(email)) {
            error = 'Invalid email format';
          } else if (fileEmailsSeen.has(email)) {
            error = 'Duplicate in file';
          } else if (existingEmails.has(email)) {
            error = 'Already a member';
          }

          if (email) fileEmailsSeen.add(email);

          return {
            rowId: idx + 1,
            fullName: fullName || email.split('@')[0] || `Member ${idx + 1}`,
            email,
            password,
            role: 'MEMBER',
            error,
            isValid: !error,
          };
        });

        setExcelRows(parsed);
        setExcelFilter('all');
        setAddModalOpen(false);
        setExcelModalOpen(true);
      } catch (err) {
        alert('Could not parse spreadsheet file: ' + err.message);
      }
    };
    reader.readAsBinaryString(file);
  };

  // Remove single row from Excel preview
  const handleRemoveRow = (rowId) => {
    setExcelRows((prev) => prev.filter((r) => r.rowId !== rowId));
  };

  // Remove all invalid rows from preview
  const handleRemoveInvalidRows = () => {
    setExcelRows((prev) => prev.filter((r) => r.isValid));
  };

  // Import validated Excel rows in batches
  const handleConfirmImport = async () => {
    const validRows = excelRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      alert('No valid rows available to import.');
      return;
    }

    setImporting(true);
    setImportProgress({ processed: 0, total: validRows.length });

    const BATCH_SIZE = 25;
    const allAdded = [];
    const allSkipped = [];
    const allFailed = [];

    for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
      const batch = validRows.slice(i, i + BATCH_SIZE);
      try {
        const res = await fetch('/api/organizations/my/members/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            members: batch.map((b) => ({
              email: b.email,
              fullName: b.fullName,
              password: b.password,
              role: b.role,
            })),
          }),
        });

        const data = await res.json();
        if (res.ok) {
          if (data.added) allAdded.push(...data.added);
          if (data.skipped) allSkipped.push(...data.skipped);
          if (data.failed) allFailed.push(...data.failed);
        } else {
          batch.forEach((b) => allFailed.push({ email: b.email, reason: data.error || 'Batch import failed' }));
        }
      } catch (batchErr) {
        batch.forEach((b) => allFailed.push({ email: b.email, reason: batchErr.message }));
      }

      setImportProgress({
        processed: Math.min(i + BATCH_SIZE, validRows.length),
        total: validRows.length,
      });
    }

    setImporting(false);
    setExcelModalOpen(false);
    setSummaryData({
      total: validRows.length,
      added: allAdded,
      skipped: allSkipped,
      failed: allFailed,
    });
    setSummaryModalOpen(true);
    await fetchMembers();
  };

  const validRowsCount = excelRows.filter((r) => r.isValid).length;
  const invalidRowsCount = excelRows.length - validRowsCount;

  const displayedExcelRows = useMemo(() => {
    if (excelFilter === 'valid') return excelRows.filter((r) => r.isValid);
    if (excelFilter === 'invalid') return excelRows.filter((r) => !r.isValid);
    return excelRows;
  }, [excelRows, excelFilter]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Hidden File Input for Excel/CSV */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Organization Verified Header */}
      <div className="relative rounded-3xl bg-gradient-to-r from-teal-50 via-white to-cyan-50 border border-teal-200 p-6 sm:p-10 shadow-md overflow-hidden">
        <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 w-96 h-96 bg-teal-100/40 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4 sm:gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 shrink-0 shadow-sm">
              <Building2 className="w-8 h-8 sm:w-10 sm:h-10" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200">
                  <ShieldCheck className="w-3.5 h-3.5" /> VERIFIED ORGANIZATION
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {organization?.organization_type || 'Educational Institution / University'}
                </span>
                {organization?.registration_number && (
                  <span className="text-xs text-slate-500">
                    Reg: {organization.registration_number}
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {organization?.name || 'SJCET'}
              </h1>

              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                {organization?.official_email && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-teal-700" />
                    <span>{organization.official_email}</span>
                  </div>
                )}
                {organization?.contact_number && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-teal-700" />
                    <span>{organization.contact_number}</span>
                  </div>
                )}
                {organization?.address && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-teal-700" />
                    <span>{organization.address}</span>
                  </div>
                )}
                {organization?.website && (
                  <a
                    href={organization.website}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-teal-700 hover:underline"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>{organization.website}</span>
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Quick Admin Actions: Add Members Button */}
          <div className="shrink-0 flex items-center gap-3">
            <button
              onClick={() => {
                setAddError(null);
                setAddSuccess(null);
                setAddModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs sm:text-sm shadow-lg shadow-cyan-500/20 flex items-center gap-2 cursor-pointer transition"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Members</span>
            </button>
          </div>
        </div>
      </div>

      {/* Organization Security & Data Isolation Notice */}
      <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-between text-xs text-slate-600">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-4 h-4 text-teal-700 shrink-0" />
          <span>
            <strong>Org-Level Data Isolation:</strong> All member listings and actions are scoped to{' '}
            <strong className="text-white">{organization?.name || 'SJCET'}</strong> based on your verified membership ID.
          </span>
        </div>
        <span className="hidden sm:inline-block px-2.5 py-0.5 rounded bg-teal-100 text-teal-700 text-[11px] font-mono border border-teal-200">
          Role: {membership?.role || 'ORG_ADMIN'}
        </span>
      </div>

      {/* Member Management Section: All Members */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between pb-6 mb-6 border-b border-slate-800 gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <Users className="w-5 h-5 text-cyan-400" />
              <h2 className="text-lg font-bold text-white tracking-tight">All Members</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Supports multiple administrators and collaboration roles within your organization.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search member or email..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950/70 border border-slate-700 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <span className="text-xs text-slate-400">
                Total Members:{' '}
                <strong className="text-white font-semibold">{members.length}</strong>
              </span>

              <button
                onClick={() => {
                  setAddError(null);
                  setAddSuccess(null);
                  setAddModalOpen(true);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-cyan-400 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add Members</span>
              </button>
            </div>
          </div>
        </div>

        {/* Member Table */}
        {loadingMembers ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-500">
            <Loader2 className="w-8 h-8 text-teal-600 animate-spin mb-3" />
            <p className="text-sm">Loading organization member roster...</p>
          </div>
        ) : membersError ? (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{membersError}</span>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Users className="w-10 h-10 mx-auto text-slate-400 mb-2" />
            <p className="text-sm font-semibold text-slate-300">
              {searchQuery ? 'No members match your search' : 'No additional members found'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {searchQuery
                ? 'Try clearing the search query.'
                : 'Click "Add Members" above to add individual or bulk Excel members.'}
            </p>
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-4 font-semibold">Member</th>
                    <th className="py-3 px-4 font-semibold">Email</th>
                    <th className="py-3 px-4 font-semibold">Organization Role</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold">Joined Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {paginatedMembers.map((member) => (
                    <tr key={member.id} className="hover:bg-slate-850/50 transition">
                      <td className="py-3.5 px-4 font-medium text-white flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-cyan-400">
                          {member.full_name ? member.full_name[0].toUpperCase() : 'U'}
                        </div>
                        <span>{member.full_name || 'Member'}</span>
                        {member.user_id === user?.id && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold">
                            You
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 font-mono text-xs">
                        {member.email}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${member.role === 'ORG_ADMIN'
                            ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                            : 'bg-slate-800 text-slate-300'
                            }`}
                        >
                          {member.role === 'ORG_ADMIN' ? 'Admin' : 'Member'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${member.status === 'ACTIVE'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : member.status === 'INVITED'
                              ? 'bg-amber-500/10 text-amber-400'
                              : 'bg-rose-500/10 text-rose-400'
                            }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          {member.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 text-xs">
                        {member.joined_at ? new Date(member.joined_at).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="pt-6 mt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
              <div className="flex items-center gap-3">
                <span>
                  Showing{' '}
                  <strong className="text-white">
                    {(currentPage - 1) * pageSize + 1}
                  </strong>{' '}
                  to{' '}
                  <strong className="text-white">
                    {Math.min(currentPage * pageSize, filteredMembers.length)}
                  </strong>{' '}
                  of <strong className="text-white">{filteredMembers.length}</strong> members
                </span>

                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none"
                >
                  <option value={10}>10 per page</option>
                  <option value={25}>25 per page</option>
                  <option value={50}>50 per page</option>
                  <option value={100}>100 per page</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="px-3 py-1 rounded-lg bg-slate-800 text-slate-200 font-medium">
                  {currentPage} of {totalPages}
                </span>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. "Add Members" Modal                                        */}
      {/* ------------------------------------------------------------- */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-cyan-500/30 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative animate-scaleUp">
            <button
              onClick={() => setAddModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-200">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Invite Members</h3>
                <p className="text-xs text-slate-400">Add a member to {organization?.name || 'SJCET'}</p>
              </div>
            </div>

            {addSuccess && (
              <div className="mb-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{addSuccess}</span>
              </div>
            )}

            {addError && (
              <div className="mb-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{addError}</span>
              </div>
            )}

            <form onSubmit={handleManualAddSubmit} className="space-y-4">
              {/* Full Name Field */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    value={addFullName}
                    onChange={(e) => setAddFullName(e.target.value)}
                    placeholder="e.g. Alex Johnson"
                    className="block w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 placeholder-slate-400"
                  />
                </div>
              </div>

              {/* Email Address Field */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Email Address *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    placeholder="colleague@domain.com"
                    className="block w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 placeholder-slate-400"
                  />
                </div>
              </div>

              {/* NEW Password Field directly below Email Field */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Password *
                  </label>
                  <span className="text-[11px] text-cyan-400 font-medium">Default: Sjcet@123#</span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={addPassword}
                    onChange={(e) => setAddPassword(e.target.value)}
                    placeholder="Sjcet@123#"
                    className="block w-full pl-10 pr-11 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 placeholder-slate-400 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white transition cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Enforces minimum 6 characters. Pre-filled with standard organization default.
                </p>
              </div>

              {/* Role Field */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Membership Role
                </label>
                <select
                  value={addRole}
                  onChange={(e) => setAddRole(e.target.value)}
                  className="block w-full px-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 cursor-pointer"
                >
                  <option value="MEMBER">Standard Member (View & Collaborate)</option>
                  <option value="ORG_ADMIN">Organization Admin (Manage Members & Settings)</option>
                </select>
              </div>

              {/* Actions row: Add Excel on bottom-left, Cancel + Submit on bottom-right */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleTriggerExcel}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-cyan-400 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition shadow-xs"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <span>Add Excel</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAddModalOpen(false)}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addLoading}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition"
                  >
                    {addLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <UserPlus className="w-4 h-4" />
                    )}
                    <span>Add Member</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. Excel Bulk Upload Preview Modal                           */}
      {/* ------------------------------------------------------------- */}
      {excelModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-slate-900 border border-cyan-500/30 rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl relative my-auto animate-scaleUp max-h-[92vh] flex flex-col">
            <button
              onClick={() => {
                if (!importing) setExcelModalOpen(false);
              }}
              disabled={importing}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg transition disabled:opacity-20"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Bulk Member Upload Preview</h3>
                  <p className="text-xs text-slate-400">
                    Review and validate members before adding to {organization?.name || 'SJCET'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDownloadSample}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-cyan-400 text-xs font-semibold border border-slate-700 transition self-start sm:self-auto"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download sample template</span>
              </button>
            </div>

            {/* Status Pills & Filter Bar */}
            <div className="py-4 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 font-semibold">
                  Total: {excelRows.length}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold">
                  ✓ Valid: {validRowsCount}
                </span>
                {invalidRowsCount > 0 && (
                  <span className="px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/30 font-semibold">
                    ⚠ Issues: {invalidRowsCount}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Filter toggle */}
                <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800">
                  <button
                    onClick={() => setExcelFilter('all')}
                    className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition ${excelFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                      }`}
                  >
                    All ({excelRows.length})
                  </button>
                  <button
                    onClick={() => setExcelFilter('valid')}
                    className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition ${excelFilter === 'valid' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                      }`}
                  >
                    Valid ({validRowsCount})
                  </button>
                  <button
                    onClick={() => setExcelFilter('invalid')}
                    className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition ${excelFilter === 'invalid' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                      }`}
                  >
                    Errors ({invalidRowsCount})
                  </button>
                </div>

                {invalidRowsCount > 0 && (
                  <button
                    type="button"
                    onClick={handleRemoveInvalidRows}
                    className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[11px] font-semibold flex items-center gap-1 transition"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Remove Bad Rows</span>
                  </button>
                )}
              </div>
            </div>

            {/* Scrollable Preview Table */}
            <div className="flex-1 overflow-y-auto border border-slate-800 rounded-2xl bg-slate-950/60 min-h-[220px]">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-900 border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider z-10">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold w-12">#</th>
                    <th className="py-2.5 px-3 font-semibold">Full Name</th>
                    <th className="py-2.5 px-3 font-semibold">Email</th>
                    <th className="py-2.5 px-3 font-semibold">Password</th>
                    <th className="py-2.5 px-3 font-semibold">Status / Validation</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Remove</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {displayedExcelRows.map((row) => (
                    <tr
                      key={row.rowId}
                      className={`hover:bg-slate-850/50 transition ${!row.isValid ? 'bg-rose-950/15' : ''
                        }`}
                    >
                      <td className="py-2 px-3 text-slate-500 font-mono text-[11px]">{row.rowId}</td>
                      <td className="py-2 px-3 text-white font-medium">{row.fullName}</td>
                      <td className="py-2 px-3 font-mono text-slate-300 text-xs">{row.email}</td>
                      <td className="py-2 px-3 font-mono text-slate-400 text-[11px]">
                        {row.password || 'Sjcet@123#'}
                      </td>
                      <td className="py-2 px-3">
                        {row.isValid ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <Check className="w-3 h-3" /> Ready
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/30">
                            <AlertCircle className="w-3 h-3" /> {row.error}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(row.rowId)}
                          disabled={importing}
                          title="Remove row"
                          className="text-slate-500 hover:text-rose-400 p-1 rounded transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Batch Progress Bar during upload */}
            {importing && (
              <div className="mt-4 p-4 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 space-y-2">
                <div className="flex items-center justify-between text-xs text-cyan-300">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                    <span className="font-semibold">
                      Importing members to organization in batches...
                    </span>
                  </div>
                  <span className="font-mono">
                    {importProgress.processed} / {importProgress.total} (
                    {Math.round((importProgress.processed / (importProgress.total || 1)) * 100)}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-300"
                    style={{
                      width: `${(importProgress.processed / (importProgress.total || 1)) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Modal Bottom Actions */}
            <div className="pt-4 mt-4 border-t border-slate-800 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleTriggerExcel}
                disabled={importing}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition"
              >
                Choose another file
              </button>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setExcelModalOpen(false)}
                  disabled={importing}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={importing || validRowsCount === 0}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-40 transition"
                >
                  {importing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Confirm & Import ({validRowsCount} Members)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4. Bulk Upload Summary Modal                                  */}
      {/* ------------------------------------------------------------- */}
      {summaryModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-cyan-500/30 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative animate-scaleUp">
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-white">Bulk Import Finished</h3>
              <p className="text-xs text-slate-400 mt-1">
                Processed {summaryData.total} members for {organization?.name || 'SJCET'}
              </p>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-3 gap-3 mb-6 text-center">
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-2xl font-black text-emerald-400">{summaryData.added.length}</p>
                <p className="text-[11px] font-semibold text-emerald-300 mt-0.5">Added</p>
              </div>

              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                <p className="text-2xl font-black text-amber-400">{summaryData.skipped.length}</p>
                <p className="text-[11px] font-semibold text-amber-300 mt-0.5">Skipped</p>
              </div>

              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                <p className="text-2xl font-black text-rose-400">{summaryData.failed.length}</p>
                <p className="text-[11px] font-semibold text-rose-300 mt-0.5">Failed</p>
              </div>
            </div>

            {/* Details on Skipped or Failed */}
            {(summaryData.skipped.length > 0 || summaryData.failed.length > 0) && (
              <div className="mb-6 max-h-48 overflow-y-auto space-y-2 text-xs">
                <p className="font-semibold text-slate-300 text-xs">Details:</p>
                {summaryData.skipped.map((s, idx) => (
                  <div
                    key={`skip-${idx}`}
                    className="p-2.5 rounded-xl bg-slate-950 border border-amber-500/20 text-amber-300 flex items-center justify-between"
                  >
                    <span className="font-mono text-[11px] truncate">{s.email}</span>
                    <span className="text-[10px] text-slate-400 ml-2 shrink-0">{s.reason}</span>
                  </div>
                ))}
                {summaryData.failed.map((f, idx) => (
                  <div
                    key={`fail-${idx}`}
                    className="p-2.5 rounded-xl bg-slate-950 border border-rose-500/20 text-rose-300 flex items-center justify-between"
                  >
                    <span className="font-mono text-[11px] truncate">{f.email}</span>
                    <span className="text-[10px] text-slate-400 ml-2 shrink-0">{f.reason}</span>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setSummaryModalOpen(false);
                fetchMembers();
              }}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/20 transition cursor-pointer"
            >
              Done & View All Members
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
