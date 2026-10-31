import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../api/client';
import {
  User,
  Mail,
  Phone,
  Lock,
  Store,
  UserCheck,
  Building2,
  MapPin,
  ChevronRight,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Layers
} from 'lucide-react';

const DEFAULT_CATEGORIES = {
  'Consumer Electronics & Mobile': [
    'Mobile Phones & Accessories',
    'Consumer Electronics & Appliances',
    'Computer & Laptop Hardware',
    'General Electronics'
  ],
  'Grocery & Kirana (Small Retail)': [
    'Kirana & Provision Stores',
    'Supermarkets & Hypermarkets',
    'Dairy & Fresh Produce',
    'General Grocery'
  ],
  'Restaurants & Food Outlets': [
    'Quick Service Restaurants (QSR)',
    'Fine Dining & Cafes',
    'Bakeries & Sweet Shops',
    'General Food & Dining'
  ],
  'Healthcare & Pharmacy': [
    'Pharmacies & Chemists',
    'Clinics & Diagnostic Labs',
    'Hospitals & Care Centers',
    'General Healthcare'
  ],
  'Essential Services': [
    'Petrol Bunk / Fuel Station',
    'Telecom / Mobile Recharge',
    'Broadband / Internet Services',
    'Other Essential Services'
  ],
  'Apparel & Footwear': [
    'Clothing & Fashion Stores',
    'Footwear & Leather Goods',
    'General Apparel'
  ],
  'General Retail & Services': [
    'Stationery & Bookstores',
    'Home Decor & Hardware',
    'Other Commercial Services'
  ]
};

export default function RegisterPage() {
  const { registerUser } = useAuth();
  const navigate = useNavigate();

  // Wizard Step: 1 = Basic Info, 2 = Account Type Selection, 3 = Merchant Details (if merchant)
  const [step, setStep] = useState(1);

  // Step 1: User Details
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Step 2: Account Type ('personal' | 'merchant')
  const [accountType, setAccountType] = useState('');

  // Step 3: Merchant Details
  const [categoriesMap, setCategoriesMap] = useState(DEFAULT_CATEGORIES);
  const [businessName, setBusinessName] = useState('');
  const [businessCategory, setBusinessCategory] = useState('Consumer Electronics & Mobile');
  const [businessSubcategory, setBusinessSubcategory] = useState('Mobile Phones & Accessories');
  const [businessAddress, setBusinessAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [contactNumber, setContactNumber] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Load server-backed categories on mount
  useEffect(() => {
    apiRequest('/auth/categories')
      .then((cats) => {
        if (Array.isArray(cats) && cats.length > 0) {
          const map = {};
          cats.forEach((c) => {
            map[c.name] = c.subcategories || ['General'];
          });
          setCategoriesMap(map);
        }
      })
      .catch(() => {
        // Fallback to DEFAULT_CATEGORIES
      });
  }, []);

  const handleCategoryChange = (newCat) => {
    setBusinessCategory(newCat);
    const availableSubs = categoriesMap[newCat] || ['General'];
    setBusinessSubcategory(availableSubs[0] || 'General');
  };

  // Step 1 validation
  const validateStep1 = () => {
    setError('');
    if (!fullName.trim()) {
      setError('Please enter your full name.');
      return false;
    }
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.endsWith('@gmail.com') || cleanEmail === '@gmail.com') {
      setError('Gmail address must end with @gmail.com');
      return false;
    }
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      setError('Phone number must contain exactly 10 digits.');
      return false;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return false;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return false;
    }
    // Prefill merchant contact with user's phone if empty
    if (!contactNumber) {
      setContactNumber(cleanPhone);
    }
    return true;
  };

  const handleNextFromStep1 = (e) => {
    e.preventDefault();
    if (validateStep1()) {
      setStep(2);
    }
  };

  // Step 2: Select Account Type
  const handleSelectAccountType = async (type) => {
    setAccountType(type);
    setError('');

    if (type === 'personal') {
      // Complete registration immediately for Personal User
      await submitRegistration('personal');
    } else {
      // Proceed to Step 3 for Merchant Details
      setStep(3);
    }
  };

  // Step 3: Merchant Submit
  const handleMerchantSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!businessName.trim()) {
      setError('Business / Shop name is required.');
      return;
    }
    if (!businessCategory.trim()) {
      setError('Business category is required.');
      return;
    }
    if (!businessSubcategory.trim()) {
      setError('Business subcategory is required.');
      return;
    }
    if (!businessAddress.trim()) {
      setError('Business address is required.');
      return;
    }
    if (!city.trim() || !state.trim()) {
      setError('City and State are required.');
      return;
    }
    const cleanContact = contactNumber.replace(/\D/g, '');
    if (cleanContact.length !== 10) {
      setError('Contact number must be exactly 10 digits.');
      return;
    }

    await submitRegistration('merchant');
  };

  // Final Registration Dispatch
  const submitRegistration = async (finalType) => {
    setLoading(true);
    setError('');

    const payload = {
      full_name: fullName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.replace(/\D/g, ''),
      password,
      confirm_password: confirmPassword,
      account_type: finalType,
    };

    if (finalType === 'merchant') {
      payload.merchant_details = {
        business_name: businessName.trim(),
        business_category: businessCategory.trim(),
        business_subcategory: businessSubcategory.trim(),
        business_address: businessAddress.trim(),
        city: city.trim(),
        state: state.trim(),
        contact_number: contactNumber.replace(/\D/g, ''),
      };
    }

    try {
      const user = await registerUser(payload);
      setSuccess(true);
      setTimeout(() => {
        if (user.account_type === 'merchant') {
          navigate('/merchant');
        } else {
          navigate('/personal');
        }
      }, 1000);
    } catch (err) {
      setError(err.message || 'Registration failed. Please check your information.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[90vh] flex items-center justify-center px-4 py-8 sm:py-12">
      <div className="max-w-xl w-full bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xl relative overflow-hidden">
        {/* Progress bar */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#002970] bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
              {step === 1 && 'Step 1 of 2: User Account'}
              {step === 2 && 'Step 2: Choose Account Type'}
              {step === 3 && 'Step 3 of 3: Merchant Profile'}
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-[#0A192F] mt-1.5">
              {step === 1 && 'Create Your Account'}
              {step === 2 && 'What type of account do you want to create?'}
              {step === 3 && 'Merchant Business Details'}
            </h2>
          </div>

          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className="inline-flex items-center space-x-1 text-xs text-slate-500 hover:text-slate-800 p-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          )}
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start space-x-2.5 text-rose-700 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center space-x-2.5 text-emerald-800 text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="font-semibold">Registration successful! Entering your dashboard...</span>
          </div>
        )}

        {/* STEP 1: Basic Credentials */}
        {step === 1 && (
          <form onSubmit={handleNextFromStep1} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                Full Name *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Ravi Kumar"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#002970] focus:bg-white transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                Gmail Address (@gmail.com) *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@gmail.com"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#002970] focus:bg-white transition-all"
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">Must end with @gmail.com</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                Phone Number (10 digits) *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="9876543210"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#002970] focus:bg-white transition-all font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Password (Min 8) *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#002970] focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Confirm Password *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#002970] focus:bg-white transition-all"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-4 py-3.5 bg-[#002970] hover:bg-[#0A192F] text-white font-bold rounded-xl shadow-lg shadow-[#002970]/20 flex items-center justify-center space-x-2 transition-all hover:scale-[1.01] text-sm cursor-pointer"
            >
              <span>Continue to Account Selection</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* STEP 2: Account Type Selection Cards (Option A vs Option B) */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-xs text-slate-600 mb-2">
              Select the appropriate role for this account. You can manage your settlements or personal UPI receipts.
            </p>

            {/* OPTION A: NORMAL PERSON */}
            <div
              onClick={() => !loading && handleSelectAccountType('personal')}
              className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-start space-x-4 ${
                accountType === 'personal'
                  ? 'border-[#002970] bg-sky-50/50 shadow-md ring-2 ring-[#002970]/20'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/80 shadow-xs'
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
                <UserCheck className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-[#0A192F] text-base">OPTION A: NORMAL PERSON</h4>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Always Free
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Personal account for normal person-to-person payments. No merchant MDR fees apply to standard P2P transfers.
                </p>
                <div className="mt-3 flex items-center text-xs font-bold text-emerald-800">
                  <span>Create Personal Account</span>
                  <ChevronRight className="w-4 h-4 ml-1" />
                </div>
              </div>
            </div>

            {/* OPTION B: MERCHANT */}
            <div
              onClick={() => !loading && handleSelectAccountType('merchant')}
              className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-start space-x-4 ${
                accountType === 'merchant'
                  ? 'border-[#002970] bg-sky-50/50 shadow-md ring-2 ring-[#002970]/20'
                  : 'border-slate-200 hover:border-[#00BAF2] hover:bg-slate-50/80 shadow-xs'
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-[#002970] text-[#00BAF2] flex items-center justify-center shrink-0 shadow-md">
                <Store className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-[#0A192F] text-base">OPTION B: MERCHANT</h4>
                  <span className="text-[10px] font-bold text-[#002970] bg-sky-100 px-2 py-0.5 rounded-full border border-sky-200">
                    Business AI
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Business account for accepting customer payments and understanding MDR deductions, fee caps, and the ₹1 Lakh cliff.
                </p>
                <div className="mt-3 flex items-center text-xs font-bold text-[#002970]">
                  <span>Setup Merchant Profile & Business Details</span>
                  <ChevronRight className="w-4 h-4 ml-1" />
                </div>
              </div>
            </div>

            {loading && (
              <div className="text-center py-3 text-xs font-semibold text-slate-500 animate-pulse">
                Creating your account...
              </div>
            )}
          </div>
        )}

        {/* STEP 3: Merchant Details Form */}
        {step === 3 && (
          <form onSubmit={handleMerchantSubmit} className="space-y-4">
            <div className="p-3 bg-sky-50 rounded-xl border border-sky-200 flex items-center space-x-2 text-xs text-[#002970] font-medium">
              <Store className="w-4 h-4 shrink-0 text-[#00BAF2]" />
              <span>Please provide your shop & business information for MDR verification.</span>
            </div>

            {/* Business Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                Shop / Business Name *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Store className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Ravi's Mobile Store"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#002970] focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Business Category & Subcategory */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Business Category *
                </label>
                <select
                  value={businessCategory}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#002970] focus:bg-white transition-all text-slate-800 font-medium"
                >
                  {Object.keys(categoriesMap).map((catName) => (
                    <option key={catName} value={catName}>
                      {catName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Subcategory *
                </label>
                <select
                  value={businessSubcategory}
                  onChange={(e) => setBusinessSubcategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#002970] focus:bg-white transition-all text-slate-800 font-medium"
                >
                  {(categoriesMap[businessCategory] || ['General']).map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Business Address */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                Business Address *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 pt-3 pointer-events-none text-slate-400">
                  <MapPin className="w-4 h-4" />
                </div>
                <textarea
                  required
                  rows={2}
                  value={businessAddress}
                  onChange={(e) => setBusinessAddress(e.target.value)}
                  placeholder="Shop No. 12, 100ft Road, Indiranagar"
                  className="w-full pl-10 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#002970] focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* City & State */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  City *
                </label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Bengaluru"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#002970] focus:bg-white transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  State *
                </label>
                <input
                  type="text"
                  required
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="Karnataka"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#002970] focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Contact Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                Merchant Business Contact Number *
              </label>
              <input
                type="tel"
                required
                maxLength={10}
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value.replace(/\D/g, ''))}
                placeholder="10-digit number"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#002970] focus:bg-white transition-all font-mono"
              />
            </div>

            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Instant Account Activation:</strong> Your merchant profile and QR code are immediately verified and active upon registration. No admin approval delay required.
              </span>
            </div>

            <button
              type="submit"
              disabled={loading || success}
              className="w-full py-3.5 bg-[#002970] hover:bg-[#0A192F] text-white font-bold rounded-xl shadow-lg shadow-[#002970]/20 flex items-center justify-center space-x-2 transition-all hover:scale-[1.01] disabled:opacity-50 text-sm cursor-pointer"
            >
              {loading ? (
                <span>Registering Merchant Account...</span>
              ) : (
                <>
                  <span>Complete Merchant Registration</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        <div className="mt-6 pt-4 border-t border-slate-100 text-center">
          <Link to="/login" className="text-xs text-slate-500 hover:text-[#002970] font-medium">
            Already have an account? <span className="font-bold underline">Login here</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
