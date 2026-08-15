import { useEffect, useState } from 'react';
import { Lock, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import SidebarLayout from '@/components/SidebarLayout';
import { PageBody, PageHeader } from '@/components/page-header';
import { Field, FieldGrid, ReadOnlyField } from '@/components/form-field';
import { ListSkeleton } from '@/components/states';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { clientPortalClientApi } from '@/services/apiService';

const mapPartyTypeToLabel = (partyType) => {
  switch (partyType) {
    case 'CUSTOMER':
      return 'Customer';
    case 'VENDOR':
      return 'Vendor';
    case 'BOTH':
      return 'Both';
    default:
      return partyType || '';
  }
};

const MyProfile = () => {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [profileForm, setProfileForm] = useState({ email: '', contactNo: '' });
  const [savingProfile, setSavingProfile] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [changingPassword, setChangingPassword] = useState(false);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await clientPortalClientApi.getMyProfile();
      const data = response.data;
      setProfile(data);
      setProfileForm({
        email: data?.email || '',
        contactNo: data?.contactNo || '',
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    try {
      setSavingProfile(true);
      await clientPortalClientApi.updateMyProfile({
        email: profileForm.email || undefined,
        contactNo: profileForm.contactNo || undefined,
      });
      toast.success('Profile updated successfully!');
      await fetchProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    if (passwordForm.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New password and confirm password do not match');
      return;
    }

    try {
      setChangingPassword(true);
      await clientPortalClientApi.changeMyPassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      toast.success('Password changed successfully!');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <SidebarLayout>
      <PageHeader title="My profile" subtitle="Your account details and login credentials" />

      <PageBody>
        {loading ? (
          <ListSkeleton rows={4} className="h-24" />
        ) : (
          <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
            {/* Account Info */}
            <Card className="gap-0 p-4 sm:p-5">
              <h2 className="font-heading text-[14.5px] font-semibold text-ink">Account details</h2>

              <div className="mt-4 grid grid-cols-1 gap-3 border-t border-line pt-4 sm:grid-cols-2">
                <ReadOnlyField label="Username" value={profile?.username} mono />
                <ReadOnlyField label="Party name" value={profile?.name} />
                <ReadOnlyField label="Party type" value={mapPartyTypeToLabel(profile?.partyType)} />
                <ReadOnlyField label="GSTIN" value={profile?.gst} mono />
              </div>

              <form onSubmit={handleProfileSave} className="mt-5 space-y-4 border-t border-line pt-4">
                <FieldGrid columns={2}>
                  <Field label="Email" htmlFor="profile-email">
                    <Input
                      id="profile-email"
                      type="email"
                      name="email"
                      value={profileForm.email}
                      onChange={handleProfileChange}
                      placeholder="you@example.com"
                    />
                  </Field>
                  <Field label="Contact number" htmlFor="profile-contact">
                    <Input
                      id="profile-contact"
                      type="text"
                      name="contactNo"
                      value={profileForm.contactNo}
                      onChange={handleProfileChange}
                      placeholder="Contact number"
                      className="font-mono"
                    />
                  </Field>
                </FieldGrid>
                <div className="flex justify-end">
                  <Button type="submit" disabled={savingProfile}>
                    <Save className="size-4" />
                    {savingProfile ? 'Saving…' : 'Save profile'}
                  </Button>
                </div>
              </form>
            </Card>

            {/* Change Password */}
            <Card className="gap-0 p-4 sm:p-5">
              <h2 className="font-heading text-[14.5px] font-semibold text-ink">Change password</h2>
              <p className="mt-0.5 text-[12.5px] text-ink-3">
                You stay signed in on this browser after changing it.
              </p>

              <form onSubmit={handlePasswordSubmit} className="mt-4 space-y-4 border-t border-line pt-4">
                <Field label="Current password" htmlFor="current-password" required>
                  <Input
                    id="current-password"
                    type="password"
                    name="currentPassword"
                    autoComplete="current-password"
                    value={passwordForm.currentPassword}
                    onChange={handlePasswordChange}
                    required
                  />
                </Field>

                <FieldGrid columns={2}>
                  <Field label="New password" htmlFor="new-password" required hint="At least 6 characters.">
                    <Input
                      id="new-password"
                      type="password"
                      name="newPassword"
                      autoComplete="new-password"
                      value={passwordForm.newPassword}
                      onChange={handlePasswordChange}
                      required
                      minLength={6}
                    />
                  </Field>
                  <Field
                    label="Confirm new password"
                    htmlFor="confirm-password"
                    required
                    error={
                      passwordForm.confirmPassword && passwordForm.confirmPassword !== passwordForm.newPassword
                        ? 'Passwords do not match'
                        : undefined
                    }
                  >
                    <Input
                      id="confirm-password"
                      type="password"
                      name="confirmPassword"
                      autoComplete="new-password"
                      value={passwordForm.confirmPassword}
                      onChange={handlePasswordChange}
                      required
                      minLength={6}
                    />
                  </Field>
                </FieldGrid>

                <div className="flex justify-end">
                  <Button type="submit" disabled={changingPassword}>
                    <Lock className="size-4" />
                    {changingPassword ? 'Updating…' : 'Update password'}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}
      </PageBody>
    </SidebarLayout>
  );
};

export default MyProfile;
