export interface UserProfileFields {
  name?: string;
  phone?: string;
  ashram?: string;
  temple?: string;
  purpose?: string;
  authorityName?: string;
  authorityRelationship?: string;
  authorityEmail?: string;
}

export interface UserFormData extends UserProfileFields {
  email?: string;
  roleId: string;
  sendEmail?: boolean;
  emailSubject?: string;
  emailBody?: string;
}

export const buildAdminUserPayload = (
  email: string,
  formData: UserFormData,
  forceUpdate = false,
) => ({
  email,
  roleId: parseInt(formData.roleId, 10),
  sendEmail: Boolean(formData.sendEmail),
  emailSubject: formData.emailSubject,
  emailBody: formData.emailBody,
  name: formData.name || undefined,
  phone: formData.phone || undefined,
  ashram: formData.ashram || undefined,
  temple: formData.temple || undefined,
  purpose: formData.purpose || undefined,
  authorityName: formData.authorityName || undefined,
  authorityRelationship: formData.authorityRelationship || undefined,
  authorityEmail: formData.authorityEmail || undefined,
  forceUpdate,
});
