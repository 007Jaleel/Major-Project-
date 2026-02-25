/**
 * EditProfile.tsx - Dedicated page for editing user profile
 * 
 * Route: /profile/edit
 * Auth: Gated by Layout (renders inside authenticated routes)
 * API: PATCH /api/v1/auth/me
 * 
 * Security:
 * - Only whitelisted fields allowed (name, email, phone, address, date_of_birth, bio, profile_picture_url)
 * - Role/ID cannot be modified
 * - Uses true PATCH semantics (only changed fields sent)
 */

import React, { useEffect, useState } from "react"; // Import React hooks for state and lifecycle.
import { useNavigate } from "react-router-dom"; // Import navigate for redirect after save.
import { useAuth } from "@/hooks/useAuth"; // Import auth hook for current user state.
import apiClient from "@/lib/apiClient"; // Import API client for backend calls.
import { Button } from "@/components/ui/button"; // Import Button component.
import { Input } from "@/components/ui/input"; // Import Input component.
import { Label } from "@/components/ui/label"; // Import Label component.
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"; // Import Card components.
import { Save, Loader2, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react"; // Import icons.

/**
 * EditProfile - Dedicated page for editing user profile information.
 * Uses same API and field whitelist as Layout.tsx dialog.
 */
export default function EditProfile() {
  const { user, updateUser, isAuthenticated, loading: authLoading } = useAuth(); // Get auth state and update function.
  const navigate = useNavigate(); // Navigation hook for redirect.

  // Local state for form fields - Account Info
  const [name, setName] = useState(""); // Editable name field.
  const [email, setEmail] = useState(""); // Editable email field.
  const [phone, setPhone] = useState(""); // Editable phone field.

  // Local state for form fields - Personal Info
  const [address, setAddress] = useState(""); // Editable address field.
  const [dateOfBirth, setDateOfBirth] = useState(""); // Editable date of birth field.
  const [bio, setBio] = useState(""); // Editable bio field.
  const [profilePictureUrl, setProfilePictureUrl] = useState(""); // Editable profile picture URL field.

  // UI state
  const [isSaving, setIsSaving] = useState(false); // Loading state for save button.
  const [saveError, setSaveError] = useState<string | null>(null); // Error message from API.
  const [saveSuccess, setSaveSuccess] = useState(false); // Success flag for UI feedback.

  // Track initial state for dirty comparison (true PATCH semantics)
  const [initialState, setInitialState] = useState<{
    name: string;
    email: string;
    phone: string;
    address: string;
    date_of_birth: string;
    bio: string;
    profile_picture_url: string;
  } | null>(null);

  /**
   * Sync form fields when user data is available.
   * Captures initial state for dirty tracking.
   */
  useEffect(() => {
    if (user) {
      const captured = {
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        address: user.address || "",
        date_of_birth: user.date_of_birth || "",
        bio: user.bio || "",
        profile_picture_url: user.profile_picture_url || "",
      };

      // Set form fields from user state.
      setName(captured.name);
      setEmail(captured.email);
      setPhone(captured.phone);
      setAddress(captured.address);
      setDateOfBirth(captured.date_of_birth);
      setBio(captured.bio);
      setProfilePictureUrl(captured.profile_picture_url);

      // Store initial state for dirty comparison.
      setInitialState(captured);
      setSaveError(null); // Clear any previous errors.
      setSaveSuccess(false); // Clear success state.
    }
  }, [user]);

  /**
   * Redirect unauthenticated users.
   * Layout handles this, but this is a safety net.
   */
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/login"); // Redirect to login if not authenticated.
    }
  }, [authLoading, isAuthenticated, navigate]);

  /**
   * Compute isDirty: true if any field differs from initial state.
   */
  const isDirty = initialState && (
    name !== initialState.name ||
    email !== initialState.email ||
    phone !== initialState.phone ||
    address !== initialState.address ||
    dateOfBirth !== initialState.date_of_birth ||
    bio !== initialState.bio ||
    profilePictureUrl !== initialState.profile_picture_url
  );

  /**
   * Handle form submission.
   * Builds payload of only changed fields (true PATCH semantics).
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent default form submission.

    // Guard: no changes to save.
    if (!isDirty) {
      setSaveError("No changes to save."); // Inform user nothing changed.
      return;
    }

    // Build payload dynamically - ONLY include changed fields.
    const payload: Record<string, string> = {};

    // Name validation: cannot be empty if included.
    if (name !== initialState?.name) {
      if (!name.trim()) {
        setSaveError("Name cannot be empty.");
        return;
      }
      payload.name = name.trim();
    }

    // Email validation: format check if included.
    if (email !== initialState?.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email.trim()) {
        setSaveError("Email cannot be empty.");
        return;
      }
      if (!emailRegex.test(email.trim())) {
        setSaveError("Invalid email format.");
        return;
      }
      payload.email = email.trim().toLowerCase();
    }

    // Phone validation: if non-empty, must be valid format.
    if (phone !== initialState?.phone) {
      if (phone.trim().length > 0) {
        const phoneRegex = /^[\d\s\-\(\)\+]+$/;
        if (!phoneRegex.test(phone.trim())) {
          setSaveError("Invalid phone format. Use digits, spaces, dashes, parentheses, or plus sign.");
          return;
        }
      }
      payload.phone = phone.trim(); // Empty string = clear field.
    }

    // Address: optional - empty string clears the field.
    if (address !== initialState?.address) {
      payload.address = address.trim();
    }

    // Date of birth: optional - must be YYYY-MM-DD if non-empty.
    if (dateOfBirth !== initialState?.date_of_birth) {
      if (dateOfBirth.trim().length > 0) {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(dateOfBirth.trim())) {
          setSaveError("Invalid date format. Use YYYY-MM-DD.");
          return;
        }
      }
      payload.date_of_birth = dateOfBirth.trim();
    }

    // Bio: optional - empty string clears the field.
    if (bio !== initialState?.bio) {
      payload.bio = bio.trim();
    }

    // Profile picture URL: optional - must be valid URL if non-empty.
    if (profilePictureUrl !== initialState?.profile_picture_url) {
      if (profilePictureUrl.trim().length > 0) {
        try {
          new URL(profilePictureUrl.trim());
        } catch {
          setSaveError("Invalid profile picture URL.");
          return;
        }
      }
      payload.profile_picture_url = profilePictureUrl.trim();
    }

    // Double-check we have something to send.
    if (Object.keys(payload).length === 0) {
      setSaveError("No changes to save.");
      return;
    }

    setIsSaving(true); // Show loading state.
    setSaveError(null); // Clear previous errors.
    setSaveSuccess(false); // Clear success state.

    try {
      // Call the PATCH /api/v1/auth/me endpoint.
      const response = await apiClient.patch('/v1/auth/me', payload);

      // Update React state from server response.
      if (response.data?.user) {
        updateUser({
          name: response.data.user.name,
          email: response.data.user.email,
          phone: response.data.user.phone,
          address: response.data.user.address,
          date_of_birth: response.data.user.date_of_birth,
          bio: response.data.user.bio,
          profile_picture_url: response.data.user.profile_picture_url,
        });

        // Update initial state to reflect saved values.
        setInitialState({
          name: response.data.user.name || "",
          email: response.data.user.email || "",
          phone: response.data.user.phone || "",
          address: response.data.user.address || "",
          date_of_birth: response.data.user.date_of_birth || "",
          bio: response.data.user.bio || "",
          profile_picture_url: response.data.user.profile_picture_url || "",
        });
      }

      setSaveSuccess(true); // Show success message.
    } catch (error: any) {
      // Extract error message from API response.
      const message = error?.response?.data?.message || error?.response?.data?.error || error?.message || "Failed to save profile";
      setSaveError(message); // Show error to user.
    } finally {
      setIsSaving(false); // Clear loading state.
    }
  };

  // Show loading state while auth is being checked.
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /> {/* Loading spinner. */}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Page header with back button. */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)} // Go back to previous page.
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> {/* Back icon. */}
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Edit Profile</h1>
          <p className="text-muted-foreground">Update your personal information and account settings.</p>
        </div>
      </div>

      {/* Profile form card. */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Settings</CardTitle>
          <CardDescription>
            Changes are saved when you click the Save button. Some fields may be read-only based on your role.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* ===== ACCOUNT INFO SECTION ===== */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b pb-2">
                Account Info
              </h3>

              {/* Name field. */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full"
                  disabled={isSaving}
                />
              </div>

              {/* Email field. */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full"
                  disabled={isSaving}
                />
              </div>

              {/* Phone field. */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter your phone number"
                  className="w-full"
                  disabled={isSaving}
                />
              </div>
            </div>

            {/* ===== PERSONAL INFO SECTION ===== */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b pb-2">
                Personal Info
              </h3>

              {/* Date of Birth field. */}
              <div className="space-y-2">
                <Label htmlFor="date_of_birth" className="text-sm font-medium">Date of Birth</Label>
                <Input
                  id="date_of_birth"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="w-full"
                  disabled={isSaving}
                />
              </div>

              {/* Address field. */}
              <div className="space-y-2">
                <Label htmlFor="address" className="text-sm font-medium">Address</Label>
                <Input
                  id="address"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter your address"
                  className="w-full"
                  disabled={isSaving}
                />
              </div>

              {/* Bio field. */}
              <div className="space-y-2">
                <Label htmlFor="bio" className="text-sm font-medium">Bio</Label>
                <Input
                  id="bio"
                  type="text"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us about yourself"
                  className="w-full"
                  disabled={isSaving}
                />
              </div>

              {/* Profile Picture URL field. */}
              <div className="space-y-2">
                <Label htmlFor="profile_picture_url" className="text-sm font-medium">Profile Picture URL</Label>
                <Input
                  id="profile_picture_url"
                  type="url"
                  value={profilePictureUrl}
                  onChange={(e) => setProfilePictureUrl(e.target.value)}
                  placeholder="https://example.com/your-photo.jpg"
                  className="w-full"
                  disabled={isSaving}
                />
              </div>
            </div>

            {/* ===== READ-ONLY FIELDS SECTION ===== */}
            <div className="rounded-lg border p-4 bg-muted/30 space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Institution Data (Read-Only)
              </h3>

              {/* Role row - read only. */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Role</span>
                <span className="text-sm font-medium capitalize">{user?.role || "-"}</span>
              </div>

              {/* Admission number row - read only, only for students. */}
              {user?.role === "student" && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Admission No</span>
                  <span className="text-sm font-medium font-mono">
                    {localStorage.getItem("admissionNo") || "-"}
                  </span>
                </div>
              )}

              {/* Department row - read only, if available. */}
              {user?.department && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Department</span>
                  <span className="text-sm font-medium">{user.department}</span>
                </div>
              )}

              {/* Semester row - read only, if available. */}
              {user?.semester && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Semester</span>
                  <span className="text-sm font-medium">{user.semester}</span>
                </div>
              )}
            </div>

            {/* Success message. */}
            {saveSuccess && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 text-green-700 border border-green-200">
                <CheckCircle className="h-4 w-4 flex-shrink-0" /> {/* Success icon. */}
                <span className="text-sm">Profile updated successfully!</span>
              </div>
            )}

            {/* Error message. */}
            {saveError && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 border border-red-200">
                <AlertCircle className="h-4 w-4 flex-shrink-0" /> {/* Error icon. */}
                <span className="text-sm">{saveError}</span>
              </div>
            )}

            {/* Action buttons. */}
            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={!isDirty || isSaving}
                className="flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> {/* Loading spinner. */}
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" /> {/* Save icon. */}
                    Save Changes
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)} // Go back to previous page.
                disabled={isSaving}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}