/**
 * Signup.tsx - New account registration (route: /signup)
 * Multi-step flow: (1) Name + Email, (2) Username + Admission number + Course, (3) Password, (4) OTP verification.
 * Uses backend: check-user (email), send-otp (email), verify-otp (creates user in DB). On success stores auth and redirects to /student/dashboard.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { User, Mail, Lock, FileText, CheckCircle, ArrowLeft, ChevronRight, Eye, EyeOff } from 'lucide-react';
import NextButton from '../../components/ui/NextButton';
import { useForm, type Resolver } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

// Auth API base path.
// Use a relative URL so Vite dev proxy (`/api` -> backend) works even if VITE_API_URL is not set.
// In production you can still set axios.defaults.baseURL (see main.tsx) to point at your API origin.
const AUTH_API_BASE = '/api/v1/auth';

// Step identifiers for the wizard (namePhone = name + email step)
type Step = 'namePhone' | 'admission' | 'password' | 'otp';

/**
 * Step-aware validation
 *
 * Important: This signup UI is a multi-step wizard, but a single Zod schema that
 * requires *all* fields would block Step 1 submission (because later-step fields
 * are not mounted/registered yet and would be missing).
 *
 * To make `handleStep1Next` work correctly, we validate only the fields relevant
 * to the current step.
 */
const nameSchema = z.string().min(2, 'Name must be at least 2 characters');
const emailSchema = z.string().email('Enter a valid email address');
const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username must be at most 30 characters')
  .regex(/^[a-zA-Z0-9_]+$/, 'Username can contain only letters, numbers, and underscore');

const admissionNoSchema = z
  .string()
  .regex(/^\d{4}$/, 'Admission No must be exactly 4 digits');

const courseSchema = z.enum(['CT', 'EC', 'MECH'], { message: 'Select a valid course' });
const semesterSchema = z.enum(['1', '2', '3', '4', '5', '6'], { message: 'Select a valid semester' });
const departmentSchema = z.string().min(1, 'Department is required');

const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');
const confirmPasswordSchema = z.string().min(1, 'Confirm password is required');
const otpSchema = z.string().regex(/^\d{6}$/, 'OTP must be 6 digits');

const baseSchema = z.object({}); // Base schema for extension

const step1Schema = baseSchema.extend({
  name: nameSchema,
  email: emailSchema,
});

const step2Schema = z.object({
  username: usernameSchema,
  admissionNo: admissionNoSchema,
  course: courseSchema,
  semester: semesterSchema,
  department: departmentSchema,
});

const step3Schema = z.object({
    password: passwordSchema,
    confirmPassword: confirmPasswordSchema,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

const step4Schema = z.object({
  otp: otpSchema,
});

const fullSchema = step1Schema.merge(step2Schema).merge(step3Schema).merge(step4Schema);

type FormFields = z.infer<typeof fullSchema>;

export default function Signup() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('namePhone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [otpTimer, setOtpTimer] = useState(0);

  // Persist signup inputs across step transitions.
  // Why: react-hook-form may unregister unmounted fields depending on configuration,
  // and OTP verification needs access to all prior step fields.
  const signupDataRef = React.useRef({
    name: '',
    email: '',
    username: '',
    admissionNo: '',
    course: 'CT',
    semester: '1',
    department: '',
    password: '',
  });

  // Keep current step available to the form resolver without relying on re-initializing useForm.
  const stepRef = React.useRef<Step>('namePhone');
  React.useEffect(() => {
    stepRef.current = step;
  }, [step]);

  const stepAwareResolver: Resolver<FormFields> = async (values, context, options) => { // Define a resolver that validates only current step fields.
    const currentStep = stepRef.current; // Read current step from ref.

    const schema = // Pick the schema for the current step.
      currentStep === 'namePhone'
        ? step1Schema
        : currentStep === 'admission'
          ? step2Schema
          : currentStep === 'password'
            ? step3Schema
            : step4Schema;

    // IMPORTANT: zodResolver() is strongly typed to the schema shape, which conflicts with our FormFields
    // (because FormFields includes all step fields). We intentionally cast to any here so TypeScript
    // doesn't reject step-specific schemas while runtime behavior remains correct.
    return (zodResolver(schema as any) as any)(values, context, options); // Delegate parsing to zodResolver.
  };

  // Shared styling for primary CTA buttons in this wizard.
  // Keeping this in one place prevents copy/paste drift across steps.
  const primaryCtaClassName =
    'w-full mt-6 h-11 bg-linear-to-r from-primary to-secondary text-white font-bold rounded-lg shadow-lg hover:shadow-xl disabled:opacity-75 disabled:cursor-not-allowed hover:-translate-y-0.5';

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    getValues,
    setValue,
    trigger,
  } = useForm<FormFields>({
    resolver: stepAwareResolver,
    mode: 'onChange',
    shouldUnregister: false, // Keep values when a step unmounts so OTP verify can still read them.
    defaultValues: { course: 'CT' as any, semester: '1' as any }, // Provide a default course so Step 2 isn't accidentally empty.
  });

  // Watch only the values needed to compute per-step disabled states.
  // (Using getValues() alone would not re-render on input changes.)
  const [name, email, username, admissionNo, course, semester, department, password, confirmPassword, otp] = watch([
    'name',
    'email',
    'username',
    'admissionNo',
    'course',
    'semester',
    'department',
    'password',
    'confirmPassword',
    'otp',
  ]);

  const isStep1Disabled =
    loading ||
    !name?.trim() ||
    !email?.trim() ||
    Boolean(errors.name) ||
    Boolean(errors.email);

  const isStep2Disabled =
    loading ||
    !username?.trim() ||
    !admissionNo?.trim() ||
    !course?.trim() ||
    !semester?.trim() ||
    !department?.trim() ||
    Boolean(errors.username) ||
    Boolean(errors.admissionNo) ||
    Boolean(errors.course) ||
    Boolean(errors.semester) ||
    Boolean(errors.department);

  const isStep3Disabled =
    loading ||
    !password?.trim() ||
    !confirmPassword?.trim() ||
    Boolean(errors.password) ||
    Boolean(errors.confirmPassword);

  const isStep4Disabled = loading || (otp?.trim()?.length ?? 0) !== 6 || Boolean(errors.otp);
 const onStep1Submit = async (data: FormFields) => {
    setError('');
    setLoading(true);
    try {
      const response = await axios.post(`${AUTH_API_BASE}/check-user`, {
        email: data.email.trim().toLowerCase(),
      });
      if (response.data.exists) {
        setError('Email already registered');
      } else {
        setStep('admission');
      }
    } catch (err: any) {
      // axios network errors often have no `response` (e.g. backend down / bad URL / CORS)
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          'Error checking user'
      );
    } finally {
      setLoading(false);
    }
  };



  // Pre-bind submit handler for the Step 1 button for readability.
  // `handleSubmit` already wraps validation + async submit.
  const handleStep1Next = handleSubmit(onStep1Submit);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Refs for inputs and buttons (formRef is not used with react-hook-form)
  const step1NextRef = React.useRef<HTMLButtonElement>(null);
  const step2NextRef = React.useRef<HTMLButtonElement>(null);
  const step3SendOtpRef = React.useRef<HTMLButtonElement>(null);
  const step4VerifyRef = React.useRef<HTMLButtonElement>(null);

  // Function to handle key presses for input navigation and button clicks
  const handleKeyPress = (
    event: React.KeyboardEvent<HTMLInputElement>,
    nextElementId?: string,
    buttonRef?: React.RefObject<HTMLButtonElement>
  ) => {
    if (event.key === 'Enter') {
      event.preventDefault(); // Prevent default form submission on Enter
      if (nextElementId) {
        document.getElementById(nextElementId)?.focus();
      } else if (buttonRef && buttonRef.current) {
        buttonRef.current.click(); // Simulate button click if no next input
      }
    }
  };

  // Countdown timer: every second decrement otpTimer until 0 (enables "Resend OTP" after 60s)
  React.useEffect(() => {
    if (otpTimer > 0) {
      const timer = setTimeout(() => setOtpTimer(otpTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpTimer]);


 
  // Step 2: Validate username + admission number + course; then go to password step
  const handleStep2 = async () => {
    setError('');
    const isValid = await trigger(['username', 'admissionNo', 'course', 'semester', 'department']);
    if (!isValid) {
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${AUTH_API_BASE}/check-user`, {
        username: getValues('username').trim(),
      });
      if (response.data.exists) {
        setError('Username already taken');
      } else {
        // Save validated Step 2 values for later OTP verification.
        signupDataRef.current.username = getValues('username')?.trim() ?? '';
        signupDataRef.current.admissionNo = getValues('admissionNo')?.trim() ?? '';
        signupDataRef.current.course = String(getValues('course') ?? 'CT').trim().toUpperCase();
        signupDataRef.current.semester = String(getValues('semester') ?? '1').trim();
        signupDataRef.current.department = getValues('department')?.trim() ?? '';
        setStep('password');
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          'Error checking username'
      );
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Validate password length and match with confirm; then send OTP to email and go to OTP step
  const handleStep3 = async () => {
    setError('');
    const isValid = await trigger(['password', 'confirmPassword']);
    if (!isValid) {
      return;
    }

    // Save name/email/password for later OTP verification.
    signupDataRef.current.name = getValues('name')?.trim() ?? '';
    signupDataRef.current.email = getValues('email')?.trim().toLowerCase() ?? '';
    signupDataRef.current.password = getValues('password') ?? '';

    setLoading(true);
    try {
      const response = await axios.post(`${AUTH_API_BASE}/send-otp`, {
        email: getValues('email').trim().toLowerCase(),
      });
      if (response.data.otp) {
        setSuccess(`Demo OTP: ${response.data.otp} (sent to ${getValues('email')})`);
      } else {
        setSuccess(`OTP sent to ${getValues('email')}`);
      }
      setOtpTimer(60);
      setStep('otp');
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          'Error sending OTP'
      );
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP to same email; resets 60s countdown
  const handleResendOTP = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.post(`${AUTH_API_BASE}/resend-otp`, {
        email: getValues('email').trim().toLowerCase(),
      });
      if (response.data.otp) {
        setSuccess(`Demo OTP: ${response.data.otp} (resent)`);
      } else {
        setSuccess(`OTP resent to ${getValues('email')}`);
      }
      setOtpTimer(60);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          'Error resending OTP'
      );
    } finally {
      setLoading(false);
    }
  };

  // Step 4: Send email + otp + name + admissionNo + password to verify-otp; on success save auth to localStorage and redirect to student dashboard
  const handleVerifyOTP = async () => {
    setError('');
    const isValid = await trigger('otp');
    if (!isValid) {
      return;
    }

    setLoading(true);
    try {
      // Build payload from the persisted ref to avoid missing fields on Step 4.
      const signupData = signupDataRef.current;

      const response = await axios.post(`${AUTH_API_BASE}/verify-otp`, {
        email: signupData.email,
        otp: getValues('otp'),
        name: signupData.name,
        username: signupData.username,
        admissionNo: signupData.admissionNo,
        course: signupData.course,
        semester: signupData.semester,
        department: signupData.department,
        password: signupData.password,
      });

      if (response.data.token) {
        const user = response.data.user;
        localStorage.setItem('authToken', response.data.token);
        localStorage.setItem('userName', getValues('name'));
        localStorage.setItem('userEmail', getValues('email').trim().toLowerCase());
        localStorage.setItem('admissionNo', getValues('admissionNo').trim());
        localStorage.setItem('course', String(getValues('course')).trim().toUpperCase());
        localStorage.setItem('semester', String(getValues('semester')).trim());
        localStorage.setItem('department', getValues('department').trim());
        localStorage.setItem('userId', String(user?.id ?? response.data.userId ?? ''));
        localStorage.setItem('userRole', user?.role ?? 'student');

        // Clear form data after successful signup
        setValue('name', '');
        setValue('email', '');
        setValue('username', '');
        setValue('admissionNo', '');
        setValue('course', 'CT' as any);
        setValue('semester', '1' as any);
        setValue('department', '');
        setValue('password', '');
        setValue('confirmPassword', '');
        setValue('otp', '');

        navigate('/student/dashboard');
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          'Error verifying OTP'
      );
    } finally {
      setLoading(false);
    }
  };

  // Back button: go to previous step or to login if on first step
  const handleBack = () => {
    if (step === 'namePhone') {
      navigate('/login');
    } else if (step === 'admission') {
      setStep('namePhone');
    } else if (step === 'password') {
      setStep('admission');
    } else if (step === 'otp') {
      setStep('password');
    }
    setError('');
    setSuccess('');
  };

  const stepTitles = {
    namePhone: 'Personal Information',
    admission: 'Admission Details',
    password: 'Set Password',
    otp: 'Verify OTP'
  };

  const steps = ['namePhone', 'admission', 'password', 'otp'] as const;
  const currentStepIndex = steps.indexOf(step);

  return (
    <div className="min-h-screen bg-linear-to-br from-background to-background-secondary flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary/10 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="card border border-border shadow-xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-linear-to-br from-primary to-secondary mb-4">
              <User className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-1">Create Account</h1>
            <p className="text-sm text-gray-700">Step {currentStepIndex + 1} of 4</p>
            <p className="text-xs text-muted-foreground mt-1">{stepTitles[step]}</p>
          </div>

          {/* Progress Bar */}
          <div className="flex gap-2 mb-6">
            {steps.map((s, i) => (
              <div
                key={s}
                className={`flex-1 h-2 rounded-full transition-all ${
                  i <= currentStepIndex ? 'bg-linear-to-r from-primary to-secondary' : 'bg-border'
                }`}
              />
            ))}
          </div>

          {/* Error Alert */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-100 text-sm mb-4 flex items-center gap-2">
              <span>⚠️</span> {error}
            </div>
          )}

          {/* Success Alert */}
          {success && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-200 text-sm mb-4 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> {success}
            </div>
          )}

          {/* Step 1: Name & Email */}
          {step === 'namePhone' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <input
                    id="fullName"
                    type="text"
                    placeholder="e.g., John Doe"
                    {...register('name')}
                    onKeyDown={(e) => handleKeyPress(e, 'email')}
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-input bg-background text-foreground placeholder-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  />
                  {name && !errors.name && (
                    <CheckCircle className="absolute right-3 top-3 w-4 h-4 text-green-500" />
                  )}
                </div>
                {errors.name?.message && (
                  <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <input
                    id="email"
                    type="email"
                    placeholder="e.g., student@college.edu"
                    {...register('email')}
                    onKeyDown={(e) => handleKeyPress(e, undefined, step1NextRef)}
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-input bg-background text-foreground placeholder-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  />
                  {email && !errors.email && (
                    <CheckCircle className="absolute right-3 top-3 w-4 h-4 text-green-500" />
                  )}
                </div>
                {errors.email?.message && (
                  <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>
                )}
              </div>

              <NextButton
                ref={step1NextRef}
                type="button"
                disabled={isStep1Disabled}
                loading={loading}
                loadingText="Checking..."
                onClick={handleStep1Next}
              />
            </div>
          )}

          {/* Step 2: Username + Admission No + Course */}
          {step === 'admission' && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-1">Admission No Format:</p>
                <p className="text-lg font-mono font-bold text-blue-600 dark:text-blue-300">0001</p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">Exactly 4 digits (college-wide unique)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <input
                    id="signupUsername"
                    type="text"
                    placeholder="Choose a unique username"
                    {...register('username', {
                      onChange: () => {
                        setError('');
                        trigger('username');
                      },
                    })}
                    onKeyDown={(e) => handleKeyPress(e, 'admissionNo')}
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-input bg-background text-foreground placeholder-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  />
                  {username && !errors.username && (
                    <CheckCircle className="absolute right-3 top-3 w-4 h-4 text-green-500" />
                  )}
                </div>
                {errors.username?.message && (
                  <p className="text-xs text-red-600 mt-1">{errors.username.message as any}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Admission Number</label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <input
                    id="admissionNo"
                    type="text"
                    placeholder="e.g., 1234"
                    {...register('admissionNo', {
                      onChange: (e) => {
                        const digitsOnly = String(e.target.value).replace(/\D/g, '').slice(0, 4);
                        setValue('admissionNo', digitsOnly);
                        trigger('admissionNo');
                        setError('');
                      },
                    })}
                    onKeyDown={(e) => handleKeyPress(e, 'course')}
                    maxLength={4}
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-input bg-background text-foreground placeholder-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent transition-all font-mono"
                  />
                  {admissionNo && !errors.admissionNo && (
                    <CheckCircle className="absolute right-3 top-3 w-4 h-4 text-green-500" />
                  )}
                </div>
                {errors.admissionNo?.message && (
                  <p className="text-xs text-red-600 mt-1">{errors.admissionNo.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Course</label>
                <div className="relative">
                  <select
                    id="course"
                    {...register('course', {
                      onChange: () => {
                        setError('');
                        trigger('course');
                      },
                    })}
                    className="w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    defaultValue={'CT'}
                    onKeyDown={(e) => {
                      // Keep Enter behavior consistent with other fields
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        step2NextRef.current?.click();
                      }
                    }}
                  >
                    <option value="CT">CT</option>
                    <option value="EC">EC</option>
                    <option value="MECH">MECH</option>
                  </select>
                </div>
                {errors.course?.message && (
                  <p className="text-xs text-red-600 mt-1">{errors.course.message as any}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Semester</label>
                <div className="relative">
                  <select
                    id="semester"
                    {...register('semester', {
                      onChange: () => {
                        setError('');
                        trigger('semester');
                      },
                    })}
                    className="w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    defaultValue={'1'}
                    onKeyDown={(e) => {
                      // Keep Enter behavior consistent with other fields
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        step2NextRef.current?.click();
                      }
                    }}
                  >
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5</option>
                    <option value="6">6</option>
                  </select>
                </div>
                {errors.semester?.message && (
                  <p className="text-xs text-red-600 mt-1">{errors.semester.message as any}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Department</label>
                <div className="relative">
                  <input
                    id="department"
                    type="text"
                    placeholder="Enter your department"
                    {...register('department')}
                    onKeyDown={(e) => handleKeyPress(e, undefined, step2NextRef)}
                    className="w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground placeholder-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  />
                  {department && !errors.department && (
                    <CheckCircle className="absolute right-3 top-3 w-4 h-4 text-green-500" />
                  )}
                </div>
                {errors.department?.message && (
                  <p className="text-xs text-red-600 mt-1">{errors.department.message as any}</p>
                )}
              </div>

              <NextButton
                ref={step2NextRef}
                type="button"
                disabled={isStep2Disabled}
                loading={loading}
                loadingText="Loading..."
                onClick={handleStep2}
              />
            </div>
          )}

          {/* Step 3: Password */}
          {step === 'password' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <input
                    id="password" // Added ID
                    type={showPassword ? 'text' : 'password'} // Toggle type based on showPassword state
                    placeholder="••••••"
                    {...register('password')}
                    onKeyDown={(e) => handleKeyPress(e, 'confirmPassword')} // Move focus to confirm password
                    className="w-full pl-10 pr-10 py-2 rounded-lg border border-input bg-background text-foreground placeholder-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
                {errors.password?.message && (
                  <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <input
                    id="confirmPassword" // Added ID
                    type={showConfirmPassword ? 'text' : 'password'} // Toggle type based on showConfirmPassword state
                    placeholder="••••••"
                    {...register('confirmPassword')}
                    onKeyDown={(e) => handleKeyPress(e, undefined, step3SendOtpRef)} // Add onKeyDown to click Send OTP button
                    className="w-full pl-10 pr-10 py-2 rounded-lg border border-input bg-background text-foreground placeholder-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground focus:outline-none"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.confirmPassword?.message && (
                  <p className="text-xs text-red-600 mt-1">{errors.confirmPassword.message}</p>
                )}
              </div>

              <button
                ref={step3SendOtpRef}
                type="button"
                onClick={handleStep3}
                disabled={isStep3Disabled}
                aria-busy={loading}
                className={primaryCtaClassName}
              >
                {loading ? 'Sending OTP...' : <>Send OTP <ChevronRight className="w-4 h-4" /></>}
              </button>
            </div>
          )}

          {/* Step 4: OTP Verification */}
          {step === 'otp' && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-center">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-1">OTP sent to</p>
                <p className="text-lg font-mono font-bold text-blue-600 dark:text-blue-300 break-all">{getValues('email')}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Enter OTP</label>
                <input
                  id="otp" // Added ID
                  type="text"
                  placeholder="000000"
                  {...register('otp', {
                    onChange: (e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setValue('otp', value);
                      trigger('otp');
                      setError('');
                    },
                  })}
                  onKeyDown={(e) => handleKeyPress(e, undefined, step4VerifyRef)} // Add onKeyDown to click Verify button
                  maxLength={6}
                  className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground placeholder-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-center text-2xl font-mono tracking-widest"
                />
                {errors.otp?.message && (
                  <p className="text-xs text-red-600 mt-2 text-center">{errors.otp.message}</p>
                )}
              </div>

              <button
                ref={step4VerifyRef}
                type="button"
                onClick={handleVerifyOTP}
                disabled={isStep4Disabled}
                aria-busy={loading}
                className={primaryCtaClassName}
              >
                {loading ? 'Verifying...' : <>Verify & Create Account <CheckCircle className="w-4 h-4" /></>}
              </button>

              <button
                onClick={handleResendOTP}
                disabled={otpTimer > 0 || loading}
                className="w-full p-2 text-primary hover:text-primary-dark text-sm font-medium transition-colors disabled:text-gray-400"
              >
                {otpTimer > 0 ? `Resend OTP in ${otpTimer}s` : 'Resend OTP'}
              </button>
            </div>
          )}

          {/* Back Button */}
          <button
            onClick={handleBack}
            className="w-full mt-6 p-2.5 border border-border text-foreground hover:bg-background transition-all rounded-lg font-medium flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          {/* Footer */}
                    <div className="mt-6 pt-6 border-t border-border text-center text-sm">
                      <p className="text-gray-700 dark:text-gray-300">
                        Already have an account?{' '}
                        <button
                          onClick={() => navigate('/login')}
                          className="font-semibold text-primary hover:text-primary-dark transition-colors"
                        >
                          Sign in
                        </button>
                      </p>
                    </div>        </div>
      </div>
    </div>
  );
}