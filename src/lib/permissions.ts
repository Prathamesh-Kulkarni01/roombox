
import type { UserRole } from './types';

// This defines the structure and labels for permissions.
// It's used to build the UI on the Settings page.
export const featurePermissionConfig = {
  properties: {
    label: "Properties",
    actions: {
      view: "View Property Layout",
      add: "Add Floors/Rooms/Beds",
      edit: "Edit Floors/Rooms/Beds",
      delete: "Delete Floors/Rooms/Beds"
    }
  },
  guests: {
    label: "Guests",
    actions: {
      view: "View Guest Details",
      add: "Add/Onboard New Guests",
      edit: "Edit Guest Info",
      delete: "Initiate/Finalize Exit"
    }
  },
  finances: {
    label: "Financials",
    actions: {
      view: "View Passbook & Expenses",
      add: "Collect Rent & Add Expenses",
    }
  },
  complaints: {
    label: "Complaints",
    actions: {
      view: "View Complaints",
      edit: "Update Complaint Status"
    }
  },
  food: {
    label: "Food Menu",
    actions: {
      view: "View Menu",
      edit: "Edit Menu"
    }
  },
  staff: {
    label: "Staff Management",
    actions: {
      view: "View Staff List",
      add: "Add New Staff",
      edit: "Edit Staff Details",
      delete: "Delete Staff",
    }
  },
  website: {
    label: "Website Builder",
    actions: {
      view: "View Site Details",
      edit: "Edit & Publish Site",
    }
  },
  seo: {
    label: "AI SEO Generator",
    actions: {
      use: "Use the AI SEO tool",
    }
  },
};

// Type definition for a single feature's permissions
export type FeatureActions = { [key: string]: boolean };

// Type definition for all feature permissions
export type FeaturePermissions = { [key: string]: FeatureActions };

// This maps a UserRole to a full set of feature permissions
export type RolePermissions = Record<UserRole, FeaturePermissions | null>;
