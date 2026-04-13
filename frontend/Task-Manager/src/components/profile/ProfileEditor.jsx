import React, { useContext, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { FaUser } from "react-icons/fa";
import Input from "../Inputs/Input";
import { UserContext } from "../../context/userContext";
import { API_PATHS } from "../../utils/apiPaths";
import axiosInstance from "../../utils/axiosInstance";
import uploadImage from "../../utils/uploadImage";
import PageLoader from "../common/PageLoader";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

const PASSWORD_MESSAGE =
  "Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a special character";
const PROFILE_LOADER_MIN_MS = 450;

const getDisplayName = (user) => user?.name || user?.username || "";

const buildInitialForm = (user) => ({
  username: getDisplayName(user),
  email: user?.email || "",
  profileImageUrl: user?.profileImageUrl || "",
  currentPassword: "",
  newPassword: "",
});

export default function ProfileEditor() {
  const { user, updateUser, loading } = useContext(UserContext);
  const [formData, setFormData] = useState(buildInitialForm(user));
  const [errors, setErrors] = useState({});
  const [imageLoadError, setImageLoadError] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [minimumLoaderDone, setMinimumLoaderDone] = useState(false);

  const imageUrl = formData.profileImageUrl?.trim() || "";
  const isGoogleOnlyAccount =
    Boolean(user?.googleId) && user?.hasPassword === false;
  const requiresCurrentPassword = !isGoogleOnlyAccount;

  useEffect(() => {
    setFormData(buildInitialForm(user));
    setErrors({});
  }, [user]);

  useEffect(() => {
    setImageLoadError(false);
  }, [imageUrl]);

  useEffect(() => {
    // Keep loader visible briefly so transition is noticeable on fast responses.
    const timeoutId = setTimeout(() => {
      setMinimumLoaderDone(true);
    }, PROFILE_LOADER_MIN_MS);

    return () => clearTimeout(timeoutId);
  }, []);

  const hasChanges = useMemo(() => {
    const currentName = getDisplayName(user).trim();
    const currentEmail = (user?.email || "").trim();
    const currentImage = (user?.profileImageUrl || "").trim();

    const nextName = formData.username.trim();
    const nextEmail = formData.email.trim();
    const nextImage = (formData.profileImageUrl || "").trim();

    return (
      nextName !== currentName ||
      nextEmail !== currentEmail ||
      nextImage !== currentImage ||
      Boolean(formData.currentPassword) ||
      Boolean(formData.newPassword)
    );
  }, [formData, user]);

  const validateForm = () => {
    const newErrors = {};
    const username = formData.username.trim();
    const email = formData.email.trim();

    if (username.length < 2 || username.length > 50) {
      newErrors.username = "Username must be between 2 and 50 characters";
    }

    if (!EMAIL_REGEX.test(email)) {
      newErrors.email = "Invalid email format";
    }

    if (formData.currentPassword && !formData.newPassword) {
      newErrors.newPassword = "New password is required";
    }

    if (formData.newPassword) {
      if (requiresCurrentPassword && !formData.currentPassword) {
        newErrors.currentPassword =
          "Current password is required to set a new password";
      }

      if (!PASSWORD_REGEX.test(formData.newPassword)) {
        newErrors.newPassword = PASSWORD_MESSAGE;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));

    if (errors[id]) {
      setErrors((prev) => ({ ...prev, [id]: "" }));
    }
  };

  const handleImageChange = async (e) => {
    const selectedFile = e.target.files?.[0];

    if (!selectedFile) return;

    setUploadingImage(true);

    try {
      const response = await uploadImage(selectedFile);
      const uploadedImageUrl = response?.imageUrl;

      if (!uploadedImageUrl) {
        throw new Error("Image uploaded but no URL was returned");
      }

      setFormData((prev) => ({
        ...prev,
        profileImageUrl: uploadedImageUrl,
      }));

      toast.success("Avatar updated successfully");
    } catch (error) {
      toast.error(error.message || "Unable to upload image");
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  };

  const handleReset = () => {
    setFormData(buildInitialForm(user));
    setErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const payload = {};
    const currentName = getDisplayName(user).trim();
    const currentEmail = (user?.email || "").trim();
    const currentImage = (user?.profileImageUrl || "").trim();

    const nextName = formData.username.trim();
    const nextEmail = formData.email.trim();
    const nextImage = (formData.profileImageUrl || "").trim();

    if (nextName !== currentName) payload.username = nextName;
    if (nextEmail !== currentEmail) payload.email = nextEmail;
    if (nextImage !== currentImage) payload.profileImageUrl = nextImage;

    if (formData.newPassword) {
      if (requiresCurrentPassword) {
        payload.currentPassword = formData.currentPassword;
      }
      payload.newPassword = formData.newPassword;
    }

    if (Object.keys(payload).length === 0) {
      toast("No changes to update");
      return;
    }

    setSaving(true);

    try {
      const response = await axiosInstance.put(
        API_PATHS.AUTH.UPDATE_PROFILE,
        payload,
      );

      const updatedUser = {
        _id: response.data._id,
        name: response.data.name,
        email: response.data.email,
        role: response.data.role || user?.role || "user",
        profileImageUrl: response.data.profileImageUrl || "",
        googleId: response.data.googleId ?? user?.googleId ?? null,
        hasPassword:
          typeof response.data.hasPassword === "boolean"
            ? response.data.hasPassword
            : user?.hasPassword,
      };

      const token = response.data.token || localStorage.getItem("token");
      updateUser(updatedUser, token);

      setFormData((prev) => ({
        ...buildInitialForm(updatedUser),
        currentPassword: "",
        newPassword: "",
      }));

      setErrors({});
      toast.success("Profile updated successfully");
    } catch (error) {
      toast.error(error.message || "Unable to update profile");
    } finally {
      setSaving(false);
    }
  };

  const showProfileLoader = loading || (Boolean(user) && !minimumLoaderDone);

  if (showProfileLoader) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <PageLoader message="Loading profile..." />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-6">
        <div className="w-full flex flex-col items-center gap-3">
          {imageUrl && !imageLoadError ? (
            <img
              src={imageUrl}
              alt="Profile Avatar"
              className="w-32 h-32 rounded-full object-cover border border-gray-200"
              onError={() => setImageLoadError(true)}
            />
          ) : (
            <div className="w-32 h-32 rounded-full border border-gray-200 bg-gray-100 flex items-center justify-center">
              <FaUser className="text-5xl text-gray-500" />
            </div>
          )}

          <label className="cursor-pointer text-sm text-blue-600 hover:text-blue-700 font-medium">
            {uploadingImage ? "Uploading image..." : "Change avatar"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
              disabled={uploadingImage || saving}
            />
          </label>
        </div>

        <form
          onSubmit={handleSubmit}
          className="w-full max-w-2xl mx-auto flex flex-col gap-4"
        >
          <Input
            id="username"
            label="Username"
            type="text"
            value={formData.username}
            onChange={handleInputChange}
            error={errors.username}
            disabled={saving || uploadingImage}
            required
            placeholder="Enter your username"
          />

          <Input
            id="email"
            label="Email"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
            error={errors.email}
            disabled={saving || uploadingImage}
            required
            placeholder="Enter your email"
          />

          {isGoogleOnlyAccount && (
            <p className="text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
              This account uses Google Sign-In. You can set a password now to
              also log in with email/password. Current password is not required.
            </p>
          )}

          {!isGoogleOnlyAccount && (
            <Input
              id="currentPassword"
              label="Current Password"
              type="password"
              value={formData.currentPassword}
              onChange={handleInputChange}
              error={errors.currentPassword}
              disabled={saving || uploadingImage}
              placeholder="Required only when setting a new password"
            />
          )}

          <Input
            id="newPassword"
            label="New Password"
            type="password"
            value={formData.newPassword}
            onChange={handleInputChange}
            error={errors.newPassword}
            disabled={saving || uploadingImage}
            placeholder={
              isGoogleOnlyAccount
                ? "Set a password for email/password login"
                : "Leave blank if you do not want to change password"
            }
          />

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving || uploadingImage || !hasChanges}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>

            <button
              type="button"
              disabled={saving || uploadingImage}
              onClick={handleReset}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Reset
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
