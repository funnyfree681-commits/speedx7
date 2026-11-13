import React, { useState, useEffect } from 'react';
import {
  FileCheck2,
  Upload,
  Eye,
  Trash2,
  CheckCircle2,
  Clock,
  XCircle,
  ShieldCheck,
  CreditCard,
  Car,
  IdCard,
  X,
} from 'lucide-react';
import { DocType, DriverDocument, User } from '../types';
import { cn } from '../lib/utils';
import { Socket } from 'socket.io-client';

interface DriverDocumentsProps {
  user: User;
  socket: Socket | null;
  onNotify: (message: string, type?: 'success' | 'error') => void;
}

interface DocConfig {
  type: DocType;
  title: string;
  subtitle: string;
  numberLabel: string;
  numberPlaceholder: string;
  helperText: string;
  hasExpiry?: boolean;
  hasVehicle?: boolean;
  icon: React.FC<{ className?: string }>;
}

const DOC_CONFIGS: DocConfig[] = [
  {
    type: 'aadhaar',
    title: 'Aadhaar Card',
    subtitle: 'UIDAI 12-Digit Identity Proof',
    numberLabel: 'Aadhaar Number',
    numberPlaceholder: '1234 5678 9012',
    helperText: 'Enter 12-digit Aadhaar number as printed on your UIDAI card.',
    icon: IdCard,
  },
  {
    type: 'pan',
    title: 'PAN Card',
    subtitle: 'Income Tax Permanent Account Number',
    numberLabel: 'PAN Number',
    numberPlaceholder: 'ABCDE1234F',
    helperText: '10-character alphanumeric PAN (e.g. ABCDE1234F).',
    icon: CreditCard,
  },
  {
    type: 'license',
    title: 'Driving License (DL)',
    subtitle: 'RTO Valid Commercial / LMV License',
    numberLabel: 'Driving License Number',
    numberPlaceholder: 'DL14 20190012345',
    helperText: 'Enter state RTO code and DL number (e.g. MH12 20190012345).',
    hasExpiry: true,
    icon: ShieldCheck,
  },
  {
    type: 'rc',
    title: 'Vehicle RC',
    subtitle: 'Registration Certificate & Vehicle Details',
    numberLabel: 'Vehicle Registration Number',
    numberPlaceholder: 'DL 01 AB 1234',
    helperText: 'Enter vehicle plate / RC number (e.g. KA 01 MJ 4589).',
    hasExpiry: true,
    hasVehicle: true,
    icon: Car,
  },
];

const VEHICLE_TYPES = ['Mini / Hatchback', 'Sedan', 'SUV', 'Auto Rickshaw', 'Bike / Moto'];

export const DriverDocuments: React.FC<DriverDocumentsProps> = ({ user, socket, onNotify }) => {
  const [documents, setDocuments] = useState<DriverDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDocType, setActiveDocType] = useState<DocType | null>(null);
  const [previewDoc, setPreviewDoc] = useState<DriverDocument | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [docNumber, setDocNumber] = useState('');
  const [holderName, setHolderName] = useState(user.name || '');
  const [expiryDate, setExpiryDate] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleType, setVehicleType] = useState(VEHICLE_TYPES[0]);
  const [fileName, setFileName] = useState('');
  const [fileData, setFileData] = useState('');

  const fetchDocuments = async () => {
    try {
      const res = await fetch(`/api/drivers/${user.id}/documents`);
      const data = await res.json();
      setDocuments(Array.isArray(data) ? data : []);
    } catch {
      onNotify('Failed to load driver documents.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [user.id]);

  useEffect(() => {
    if (!socket) return;
    const handleDocUpdate = (updated: DriverDocument) => {
      if (updated.driver_id === user.id) {
        setDocuments((prev) => {
          const idx = prev.findIndex((d) => d.doc_type === updated.doc_type);
          if (idx > -1) {
            const copy = [...prev];
            copy[idx] = updated;
            return copy;
          }
          return [updated, ...prev];
        });
      }
    };
    socket.on('driver_document_updated', handleDocUpdate);
    return () => {
      socket.off('driver_document_updated', handleDocUpdate);
    };
  }, [socket, user.id]);

  const openEditor = (type: DocType) => {
    const existing = documents.find((d) => d.doc_type === type);
    setActiveDocType(type);
    setDocNumber(existing?.doc_number || '');
    setHolderName(existing?.holder_name || user.name || '');
    setExpiryDate(existing?.expiry_date || '');
    setVehicleModel(existing?.vehicle_model || '');
    setVehicleType(existing?.vehicle_type || VEHICLE_TYPES[0]);
    setFileName(existing?.file_name || '');
    setFileData(existing?.file_data || '');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      onNotify('File size must be under 4 MB.', 'error');
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setFileData(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const validateDocNumber = (type: DocType, raw: string): string | null => {
    const cleaned = raw.trim();
    if (type === 'aadhaar') {
      const digits = cleaned.replace(/\s+/g, '');
      if (!/^\d{12}$/.test(digits)) {
        return 'Aadhaar number must be exactly 12 digits (e.g. 1234 5678 9012).';
      }
    }
    if (type === 'pan') {
      const upper = cleaned.toUpperCase();
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(upper)) {
        return 'PAN must match 10-character format (e.g. ABCDE1234F).';
      }
    }
    if (type === 'license' && cleaned.length < 8) {
      return 'Please enter a valid Driving License number.';
    }
    if (type === 'rc' && cleaned.length < 6) {
      return 'Please enter a valid Vehicle RC number (e.g. DL 01 AB 1234).';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDocType) return;

    const validationError = validateDocNumber(activeDocType, docNumber);
    if (validationError) {
      onNotify(validationError, 'error');
      return;
    }

    const formattedNumber =
      activeDocType === 'aadhaar'
        ? docNumber.replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 ')
        : activeDocType === 'pan' || activeDocType === 'rc' || activeDocType === 'license'
        ? docNumber.trim().toUpperCase()
        : docNumber.trim();

    setSaving(true);
    try {
      const res = await fetch(`/api/drivers/${user.id}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doc_type: activeDocType,
          doc_number: formattedNumber,
          holder_name: holderName,
          expiry_date: expiryDate || null,
          vehicle_model: activeDocType === 'rc' ? vehicleModel : null,
          vehicle_type: activeDocType === 'rc' ? vehicleType : null,
          file_name: fileName || null,
          file_data: fileData || null,
        }),
      });
      const result = await res.json();
      if (!res.ok) {
        onNotify(result.error || 'Failed to save document.', 'error');
        return;
      }
      await fetchDocuments();
      setActiveDocType(null);
      onNotify('Document submitted for verification.', 'success');
    } catch {
      onNotify('Network error while uploading document.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (type: DocType) => {
    try {
      await fetch(`/api/drivers/${user.id}/documents/${type}`, { method: 'DELETE' });
      setDocuments((prev) => prev.filter((d) => d.doc_type !== type));
      onNotify('Document removed.', 'success');
    } catch {
      onNotify('Failed to remove document.', 'error');
    }
  };

  const submittedCount = documents.length;
  const verifiedCount = documents.filter((d) => d.status === 'verified').length;
  const activeConfig = DOC_CONFIGS.find((c) => c.type === activeDocType);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Driver KYC & Vehicle Documents
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
            <span>Mandatory Indian KYC Verification</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums text-slate-700">
              {submittedCount}/4 Uploaded
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums text-emerald-700 font-medium">
              {verifiedCount}/4 Verified
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
          {verifiedCount === 4 ? (
            <span className="inline-flex items-center gap-1.5 text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
              All KYC Verified
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-amber-700">
              <Clock className="w-4 h-4" />
              {4 - submittedCount > 0
                ? `${4 - submittedCount} Document(s) Remaining`
                : 'Awaiting Admin Approval'}
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-48 bg-white border border-slate-200 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {DOC_CONFIGS.map((cfg) => {
            const doc = documents.find((d) => d.doc_type === cfg.type);
            const Icon = cfg.icon;
            return (
              <div
                key={cfg.type}
                className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between gap-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="p-2.5 bg-slate-900 rounded-lg text-amber-400 shrink-0">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-slate-900">{cfg.title}</h2>
                      <p className="text-xs text-slate-500 mt-0.5">{cfg.subtitle}</p>
                    </div>
                  </div>
                  <div className="text-xs font-medium shrink-0">
                    {!doc && <span className="text-slate-400">Not Uploaded</span>}
                    {doc?.status === 'pending' && (
                      <span className="inline-flex items-center gap-1 text-amber-700">
                        <Clock className="w-3.5 h-3.5" />
                        Pending Review
                      </span>
                    )}
                    {doc?.status === 'verified' && (
                      <span className="inline-flex items-center gap-1 text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Verified
                      </span>
                    )}
                    {doc?.status === 'rejected' && (
                      <span className="inline-flex items-center gap-1 text-red-600">
                        <XCircle className="w-3.5 h-3.5" />
                        Rejected
                      </span>
                    )}
                  </div>
                </div>

                {doc ? (
                  <div className="border-t border-slate-100 pt-4 space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 text-xs">{cfg.numberLabel}</span>
                      <span className="font-mono tabular-nums font-medium text-slate-900">
                        {doc.doc_number}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 text-xs">Name on Document</span>
                      <span className="text-slate-800 font-medium">{doc.holder_name}</span>
                    </div>
                    {doc.expiry_date && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 text-xs">Valid Till</span>
                        <span className="font-mono tabular-nums text-slate-700">{doc.expiry_date}</span>
                      </div>
                    )}
                    {doc.vehicle_model && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 text-xs">Vehicle</span>
                        <span className="text-slate-800">
                          {doc.vehicle_model} · {doc.vehicle_type}
                        </span>
                      </div>
                    )}
                    {doc.file_name && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 text-xs">Attachment</span>
                        <span className="text-xs text-slate-600 truncate max-w-[180px]">
                          {doc.file_name}
                        </span>
                      </div>
                    )}
                    {doc.status === 'rejected' && doc.rejection_reason && (
                      <p className="text-xs text-red-600 pt-1">
                        Reason: {doc.rejection_reason}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="border-t border-slate-100 pt-4">
                    <p className="text-xs text-slate-500 leading-relaxed">{cfg.helperText}</p>
                  </div>
                )}

                <div className="flex items-center justify-between gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => openEditor(cfg.type)}
                    className={cn(
                      'px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap inline-flex items-center gap-1.5',
                      doc
                        ? 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                        : 'bg-emerald-600 text-white hover:bg-emerald-700'
                    )}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {doc ? 'Update Document' : `Upload ${cfg.title}`}
                  </button>

                  {doc && (
                    <div className="flex items-center gap-2">
                      {doc.file_data && (
                        <button
                          type="button"
                          onClick={() => setPreviewDoc(doc)}
                          className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                          title="View uploaded file"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(cfg.type)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete document"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload / Edit Modal */}
      {activeDocType && activeConfig && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg p-6 shadow-xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {activeConfig.title} Details
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">{activeConfig.subtitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveDocType(null)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {activeConfig.numberLabel}
                </label>
                <input
                  type="text"
                  required
                  value={docNumber}
                  onChange={(e) => setDocNumber(e.target.value)}
                  placeholder={activeConfig.numberPlaceholder}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
                <p className="text-xs text-slate-500 mt-1">{activeConfig.helperText}</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Full Name (as printed on document)
                </label>
                <input
                  type="text"
                  required
                  value={holderName}
                  onChange={(e) => setHolderName(e.target.value)}
                  placeholder="Rajesh Kumar Sharma"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              {activeConfig.hasExpiry && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Valid Till / Expiry Date
                  </label>
                  <input
                    type="date"
                    required
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              )}

              {activeConfig.hasVehicle && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Vehicle Model
                    </label>
                    <input
                      type="text"
                      required
                      value={vehicleModel}
                      onChange={(e) => setVehicleModel(e.target.value)}
                      placeholder="Maruti Suzuki Dzire"
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Vehicle Category
                    </label>
                    <select
                      value={vehicleType}
                      onChange={(e) => setVehicleType(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    >
                      {VEHICLE_TYPES.map((vt) => (
                        <option key={vt} value={vt}>
                          {vt}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Upload Document Copy (JPG, PNG, or PDF · Max 4 MB)
                </label>
                <label className="flex flex-col items-center justify-center border border-dashed border-slate-300 rounded-lg p-5 cursor-pointer hover:bg-slate-50 transition-colors">
                  <FileCheck2 className="w-6 h-6 text-slate-400 mb-2" />
                  <span className="text-xs font-medium text-slate-700">
                    {fileName || 'Choose photo or scan of document'}
                  </span>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
                {fileData && fileData.startsWith('data:image/') && (
                  <div className="mt-3 border border-slate-200 rounded-lg overflow-hidden">
                    <img
                      src={fileData}
                      alt={`${activeConfig.title} preview`}
                      className="w-full max-h-40 object-contain bg-slate-50"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveDocType(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save & Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document Image Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 capitalize">
                  {previewDoc.doc_type} Document Preview
                </h3>
                <p className="text-xs font-mono text-slate-500">{previewDoc.doc_number}</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {previewDoc.file_data?.startsWith('data:image/') ? (
              <img
                src={previewDoc.file_data}
                alt={`${previewDoc.doc_type} document`}
                className="w-full max-h-[60vh] object-contain rounded-lg bg-slate-50 border border-slate-200"
              />
            ) : (
              <div className="p-8 text-center bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-sm font-medium text-slate-700">
                  Uploaded File: {previewDoc.file_name || 'Document File'}
                </p>
                {previewDoc.file_data && (
                  <a
                    href={previewDoc.file_data}
                    download={previewDoc.file_name || `${previewDoc.doc_type}.pdf`}
                    className="inline-block mt-3 px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg"
                  >
                    Download Document
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
