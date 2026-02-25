import React, { useState } from 'react'; // Import React and the useState hook
import { useNavigate } from 'react-router-dom'; // Import the useNavigate hook for navigation
import axios from 'axios'; // Import axios for making API requests
import { useForm } from 'react-hook-form'; // Import the useForm hook for form handling
import { zodResolver } from '@hookform/resolvers/zod'; // Import the zodResolver for schema validation
import { z } from 'zod'; // Import z for schema definition
import { Lock, Mail, ArrowRight, AlertCircle, HelpCircle, Eye, EyeOff, BookOpen } from 'lucide-react'; // Import icons
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Import Card components
import { Input } from '@/components/ui/input'; // Import Input component
import { Button } from '@/components/ui/button'; // Import Button component
import { Label } from '@/components/ui/label'; // Import Label component
import LoadingSpinner from '@/components/ui/LoadingSpinner'; // Import LoadingSpinner component

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'), // Define username validation rule
  password: z.string().min(1, 'Password is required'), // Define password validation rule
});

type FormFields = z.infer<typeof loginSchema>; // Infer the form fields type from the schema

export default function Login() {
  const [rememberMe, setRememberMe] = useState(false); // State for the "Remember me" checkbox
  const [loading, setLoading] = useState(false); // State for loading indicator
  const [error, setError] = useState(''); // State for error messages
  const [showPassword, setShowPassword] = useState(false); // State for password visibility
  const navigate = useNavigate(); // Hook for navigation

  const {
    register, // Function to register inputs
    handleSubmit, // Function to handle form submission
    formState: { errors }, // Object containing form state and errors
    reset, // Function to reset the form state
    clearErrors, // Function to clear form errors
  } = useForm<FormFields>({
    resolver: zodResolver(loginSchema), // Use the zod resolver for validation
    mode: 'onBlur', // Validate on blur
    reValidateMode: 'onChange', // Re-validate on change after initial blur
    shouldUnregister: true, // Unregister fields when they are unmounted
    defaultValues: { // Explicitly set default values to empty strings
      username: '',
      password: '',
    },
  });

  // Reset the form and clear errors when the component mounts
  React.useEffect(() => {
    reset({ // Reset form fields to empty strings
      username: '',
      password: '',
    });
    clearErrors(); // Clear any existing validation errors
  }, [reset, clearErrors]); // Dependency array ensures effect runs only when reset or clearErrors functions change


  // Submit login to backend; on success store token/user and redirect by role
  const onLogin = async (data: FormFields) => {
    setLoading(true); // Set loading to true
    setError(''); // Clear any previous errors

    try {
      // Make a POST request to the login endpoint
      const response = await axios.post('/api/v1/auth/login', {
        username: data.username.trim(), // Send trimmed username
        password: data.password.trim(), // Send trimmed password
      }, { timeout: 30000 }); // Set a 30-second timeout

      // If the response contains a token, the login was successful
      if (response.data.token) {
        // If "Remember me" is checked, store the username in localStorage
        if (rememberMe) {
          localStorage.setItem('rememberedUser', data.username.trim());
        } else {
          localStorage.removeItem('rememberedUser');
        }

        const user = response.data.user; // Get the user object from the response
        // Store user data in localStorage
        localStorage.setItem('authToken', response.data.token);
        localStorage.setItem('userName', user?.username ?? data.username.trim());
        if (user?.id != null) localStorage.setItem('userId', String(user.id));
        if (user?.role) localStorage.setItem('userRole', user.role);
        if (user?.roll) localStorage.setItem('roll', String(user.roll));
        if (user?.roll) localStorage.setItem('admissionNo', String(user.roll));
        if (user?.course) localStorage.setItem('course', String(user.course));

        const role = user?.role; // Get the user's role
        // Redirect the user based on their role
        if (role === 'student') navigate('/student/dashboard');
        else if (role === 'teacher') navigate('/teacher/dashboard');
        else if (role === 'parent') navigate('/parent/dashboard');
        else if (role === 'admin') navigate('/admin/dashboard');
        else navigate('/dashboard');
      }
    } catch (err: any) {
      // Handle login errors
      if (axios.isAxiosError(err) && err.response) {
        setError(err.response.data.message || 'An error occurred during login.');
      } else {
        setError('An unknown error occurred.');
      }
    } finally {
      setLoading(false); // Set loading back to false
    }
  };

  // Placeholder for forgot password functionality
  const handleForgotPassword = () => {
    alert("Please contact your department administrator to reset your password.");
  };

  const getLoginUrl = () => "/login"; // Helper to get the login URL

  return (
    <div className="min-h-screen bg-background"> {/* Main container */}
      <nav className="border-b border-border bg-card sticky top-0 z-50"> {/* Navigation bar */}
        <div className="container flex items-center justify-between h-16"> {/* Container for nav content */}
          <div className="flex items-center gap-2"> {/* Logo and title */}
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold gradient-text">EduConnect</span>
          </div>
          <Button onClick={() => navigate(getLoginUrl())} className="btn-primary">
            Sign In
          </Button>
        </div>
      </nav>
      <div className="flex items-center justify-center p-4"> {/* Centered content */}
        <div className="w-full max-w-md"> {/* Max width container */}
          <Card className="card-elegant"> {/* Login card */}
            <CardHeader className="text-center"> {/* Card header */}
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 mb-4 shadow-lg">
                <Lock className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-3xl font-bold text-foreground mb-2">Welcome Back</CardTitle>
              <p className="text-sm text-muted-foreground">Sign in to your EduConnect account</p>
            </CardHeader>
            <CardContent> {/* Card content */}
              {error && ( // Display error message if there is one
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm mb-6 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}
              <form onSubmit={handleSubmit(onLogin)} className="space-y-4"> {/* Login form */}
                <div className="space-y-2"> {/* Username field */}
                  <Label htmlFor="username">Username</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="username"
                      type="text"
                      {...register('username')} // Register the input with react-hook-form
                      className="pl-10"
                      placeholder="Enter username"
                    />
                  </div>
                  {errors.username && <p className="text-xs text-red-600 mt-1">{errors.username.message}</p>}
                </div>
                <div className="space-y-2"> {/* Password field */}
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'} // Toggle password visibility
                      {...register('password')} // Register the input with react-hook-form
                      className="pl-10 pr-10"
                      placeholder="••••••"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowPassword(!showPassword)} // Toggle password visibility
                      className="absolute inset-y-0 right-0 h-full px-3 flex items-center text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>}
                </div>
                <div className="flex items-center justify-between"> {/* Remember me and Forgot Password */}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="rememberMe"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)} // Update rememberMe state
                      className="w-4 h-4 rounded border-input text-primary focus:ring-primary"
                    />
                    <Label htmlFor="rememberMe" className="text-sm text-muted-foreground cursor-pointer">Remember me</Label>
                  </div>
                  <Button
                    type="button"
                    variant="link"
                    onClick={handleForgotPassword} // Call forgot password handler
                    className="text-sm font-medium text-primary hover:text-primary/80"
                  >
                    <HelpCircle className="w-3.5 h-3.5 mr-1" />
                    Forgot Password?
                  </Button>
                </div>
                <Button
                  type="submit"
                  disabled={loading} // Disable button when loading
                  className="w-full btn-primary"
                >
                  {loading ? ( // Show spinner when loading
                    <LoadingSpinner />
                  ) : (
                    <>Sign In <ArrowRight className="w-4 h-4" /></>
                  )}
                </Button>
              </form>
              <div className="my-6 flex items-center gap-3"> {/* Separator */}
                <div className="flex-1 h-px bg-border"></div>
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">New here?</span>
                <div className="flex-1 h-px bg-border"></div>
              </div>
              <Button
                variant="outline"
                onClick={() => navigate('/signup')} // Navigate to signup page
                className="w-full btn-secondary"
              >
                Create an Account
              </Button>
            </CardContent>
          </Card>
          <div className="mt-8 text-center text-xs text-muted-foreground space-y-1"> {/* Footer */}

            <p>New accounts: sign in with your chosen Username and password</p>
            <p>Kerala Polytechnic LMS | RTI 2005 Compliant</p>
          </div>
        </div>
      </div>
    </div>
  );
}

