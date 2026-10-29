import BackButton from "../components/BackButton";
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Building2,
  Mail,
  Lock,
  Phone,
  MapPin,
  Globe,
  Upload,
  FileText,
  User,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
  X,
} from 'lucide-react';

export default function OrganizationSignup() {
  const { signupOrganization } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    organization_type: 'NGO / Non-Profit',
    registration_number: '',
    official_email: '',
    contact_number: '',
    address: '',
    website: '',
    representative_name: '',
    representative_email: '',
    representative_password: '',
    confirm_password: '',
    acceptTerms: false,
  });

  const [documentFile, setDocumentFile] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successNotice, setSuccessNotice] = useState(false);

  const orgTypes = [
    'NGO / Non-Profit',
    'Sustainable Enterprise / Business',
    'Educational Institution / University',
    'Community Group / Housing Society',
    'Renewable Energy / CleanTech',
    'Government / Municipal Body',
  ];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Verification document must be smaller than 5 MB.');
        return;
      }
      setDocumentFile(file);
      setError(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Form validation
    if (
      !formData.name ||
      !formData.official_email ||
      !formData.contact_number ||
      !formData.address ||
      !formData.representative_name ||
      !formData.representative_email ||
      !formData.representative_password
    ) {
      setError('Please fill in all required organization and representative fields.');
      return;
    }

    if (formData.representative_password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (
      !/[A-Z]/.test(formData.representative_password) ||
      !/[0-9]/.test(formData.representative_password)
    ) {
      setError('Password must contain at least one uppercase letter and one number.');
      return;
    }

    if (formData.representative_password !== formData.confirm_password) {
      setError('Representative passwords do not match.');
      return;
    }

    if (!formData.acceptTerms) {
      setError('You must accept the Organization Registration Terms.');
      return;
    }

    try {
      setLoading(true);

      const payload = new FormData();
      payload.append('name', formData.name);
      payload.append('organization_type', formData.organization_type);
      payload.append('registration_number', formData.registration_number);
      payload.append('official_email', formData.official_email);
      payload.append('contact_number', formData.contact_number);
      payload.append('address', formData.address);
      payload.append('website', formData.website);
      payload.append('representative_name', formData.representative_name);
      payload.append('representative_email', formData.representative_email);
      payload.append('representative_password', formData.representative_password);
      payload.append('acceptTerms', 'true');

      if (documentFile) {
        payload.append('document', documentFile);
      }

      await signupOrganization(payload);

      // Show prompt requirement: "Your organization registration request is pending admin approval."
      setSuccessNotice(true);
      setTimeout(() => {
        navigate('/pending-approval', { replace: true });
      }, 2000);
    } catch (err) {
      setError(err.message || 'Failed to submit organization registration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-teal-50 rounded-full blur-[140px] pointer-events-none" />

      {/* Standard Website Top Header Bar */}
      <header className="relative z-10 w-full px-4 sm:px-8 py-5 border-b border-teal-100/60 mb-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <BackButton fallback="/signup" label="Back" />
          <Link to="/" className="inline-flex items-center group cursor-pointer" title="TERRA AI Home">
            <img 
              src="/terra-ai-logo.svg" 
              alt="TERRA AI Logo" 
              className="h-10 w-auto object-contain transition-transform group-hover:scale-105" 
            />
          </Link>
          <Link 
            to="/login/organization" 
            className="text-xs sm:text-sm font-bold text-teal-800 hover:text-teal-950 bg-white/80 border border-teal-200/80 px-4 py-1.5 rounded-full shadow-2xs transition"
          >
            Org Sign In
          </Link>
        </div>
      </header>

      {/* Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl text-center relative z-10 px-4 mb-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
          Register Your Organization
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Join our verified network of green enterprises, non-profits, and educational bodies
        </p>
      </div>

      {/* Main Container */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl relative z-10 px-4">
        <div className="bg-white backdrop-blur-xl py-8 px-6 sm:px-10 shadow-2xl rounded-3xl border border-slate-200">
          {/* Success Banner */}
          {successNotice && (
            <div className="mb-6 p-5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 flex items-start gap-3.5 animate-fadeIn">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-base text-slate-800">Registration Submitted!</h4>
                <p className="text-sm mt-1 text-emerald-200 font-medium">
                  Your organization registration request is pending admin approval. Redirecting to status tracker...
                </p>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-300 text-sm animate-shake">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Section 1: Organization Details */}
            <div>
              <div className="flex items-center gap-2 pb-2 mb-4 border-b border-slate-200">
                <Building2 className="w-4 h-4 text-teal-700" />
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                  Organization Details
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Org Name */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Organization Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g. EcoSphere Foundation or CleanEarth Corp"
                    className="block w-full px-4 py-3 bg-white/60 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm transition"
                  />
                </div>

                {/* Org Type */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Organization Type *
                  </label>
                  <select
                    name="organization_type"
                    value={formData.organization_type}
                    onChange={handleChange}
                    className="block w-full px-4 py-3 bg-white/60 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 transition"
                  >
                    {orgTypes.map((type) => (
                      <option key={type} value={type} className="bg-slate-900 text-slate-800">
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Registration Number (Optional) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Registration / Tax Number <span className="text-slate-500 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    name="registration_number"
                    value={formData.registration_number}
                    onChange={handleChange}
                    placeholder="e.g. REG-8849204"
                    className="block w-full px-4 py-3 bg-white/60 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm transition"
                  />
                </div>

                {/* Official Email */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Official Email *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Mail className="h-4 w-4" />
                    </div>
                    <input
                      type="email"
                      name="official_email"
                      required
                      value={formData.official_email}
                      onChange={handleChange}
                      placeholder="info@org.org"
                      className="block w-full pl-10 pr-4 py-3 bg-white/60 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm transition"
                    />
                  </div>
                </div>

                {/* Contact Number */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Official Contact Number *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Phone className="h-4 w-4" />
                    </div>
                    <input
                      type="tel"
                      name="contact_number"
                      required
                      value={formData.contact_number}
                      onChange={handleChange}
                      placeholder="+1 (555) 000-1234"
                      className="block w-full pl-10 pr-4 py-3 bg-white/60 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm transition"
                    />
                  </div>
                </div>

                {/* Address */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Address / Physical HQ Location *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      name="address"
                      required
                      value={formData.address}
                      onChange={handleChange}
                      placeholder="Suite 400, Green Plaza, City, Country"
                      className="block w-full pl-10 pr-4 py-3 bg-white/60 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm transition"
                    />
                  </div>
                </div>

                {/* Website (Optional) */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Website URL <span className="text-slate-500 font-normal">(Optional)</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Globe className="h-4 w-4" />
                    </div>
                    <input
                      type="url"
                      name="website"
                      value={formData.website}
                      onChange={handleChange}
                      placeholder="https://your-organization.org"
                      className="block w-full pl-10 pr-4 py-3 bg-white/60 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm transition"
                    />
                  </div>
                </div>

                {/* Verification Document Upload */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Official Verification Document (Certificate, Tax Exempt, License)
                  </label>
                  <div className="border-2 border-dashed border-slate-200 hover:border-cyan-500/50 rounded-2xl p-4 text-center bg-white/40 transition">
                    {documentFile ? (
                      <div className="flex items-center justify-between p-3 bg-cyan-950/40 border border-teal-200 rounded-xl">
                        <div className="flex items-center gap-3 text-left overflow-hidden">
                          <FileText className="w-8 h-8 text-teal-700 shrink-0" />
                          <div className="truncate">
                            <p className="text-xs font-semibold text-slate-800 truncate">{documentFile.name}</p>
                            <p className="text-[11px] text-cyan-300">
                              {(documentFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setDocumentFile(null)}
                          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-800"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer flex flex-col items-center">
                        <Upload className="w-8 h-8 text-teal-700 mb-2" />
                        <span className="text-xs font-semibold text-slate-200">
                          Click or drag verification document here
                        </span>
                        <span className="text-[11px] text-slate-500 mt-1">
                          PDF, PNG, JPG, or WEBP up to 5 MB
                        </span>
                        <input
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg,.webp"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    Uploaded documents are securely stored in private storage and accessible only by Terra AI Super Admins.
                  </p>
                </div>
              </div>
            </div>

            {/* Section 2: Representative Account */}
            <div className="pt-4">
              <div className="flex items-center gap-2 pb-2 mb-4 border-b border-slate-200">
                <User className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                  Organization Representative / Admin Account
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Rep Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Representative Full Name *
                  </label>
                  <input
                    type="text"
                    name="representative_name"
                    required
                    value={formData.representative_name}
                    onChange={handleChange}
                    placeholder="Dr. Alex Rivera"
                    className="block w-full px-4 py-3 bg-white/60 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm transition"
                  />
                </div>

                {/* Rep Email */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Representative Login Email *
                  </label>
                  <input
                    type="email"
                    name="representative_email"
                    required
                    value={formData.representative_email}
                    onChange={handleChange}
                    placeholder="alex@org.org"
                    className="block w-full px-4 py-3 bg-white/60 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm transition"
                  />
                </div>

                {/* Rep Password */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Login Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="representative_password"
                      required
                      value={formData.representative_password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className="block w-full pl-4 pr-11 py-3 bg-white/60 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Rep Confirm Password */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Confirm Password *
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="confirm_password"
                    required
                    value={formData.confirm_password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="block w-full px-4 py-3 bg-white/60 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm transition"
                  />
                </div>
              </div>
            </div>

            {/* Terms Checkbox */}
            <div className="pt-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="acceptTerms"
                  checked={formData.acceptTerms}
                  onChange={handleChange}
                  className="mt-0.5 w-4 h-4 rounded bg-white border-slate-700 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-900"
                />
                <span className="text-xs text-slate-500 leading-relaxed">
                  I certify that I am an authorized representative of this organization and agree to the{' '}
                  <span className="text-teal-700 underline">Terra AI Partner Agreement</span> and verification review.
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || successNotice}
              className="w-full mt-4 py-3.5 px-4 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Submitting Registration for Admin Review...</span>
                </>
              ) : (
                <>
                  <span>Submit Organization for Approval</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 pt-5 border-t border-slate-200 text-center space-y-2">
            <p className="text-xs text-slate-500">
              Already an organization admin?{' '}
              <Link to="/login/organization" className="text-teal-700 hover:text-cyan-300 font-semibold underline underline-offset-4">
                sign in.
              </Link>
            </p>
            <p className="text-xs text-slate-500">
              Want to join as an individual citizen instead?{' '}
              <Link to="/signup/individual" className="text-emerald-400 hover:text-emerald-300 font-semibold underline underline-offset-4">
                Individual Signup
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
