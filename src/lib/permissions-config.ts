import { 
  Home, 
  Users, 
  CircleDollarSign, 
  MessageSquare, 
  Utensils, 
  UserCog, 
  Globe, 
  Zap, 
  FileCheck 
} from 'lucide-react';

export interface PermissionAction {
  id: string;
  label: string;
}

export interface FeatureConfig {
  featureId: string;
  featureName: string;
  icon: React.ElementType;
  actions: PermissionAction[];
}

export const featurePermissionConfig: FeatureConfig[] = [
  {
    featureId: 'properties',
    featureName: 'Properties',
    icon: Home,
    actions: [
      { id: 'view', label: "View Property Layout" },
      { id: 'add', label: "Add Floors/Rooms/Beds" },
      { id: 'edit', label: "Edit Floors/Rooms/Beds" },
      { id: 'delete', label: "Delete Floors/Rooms/Beds" },
      { id: 'sharedCharge', label: "Manage Shared Charges" },
    ]
  },
  {
    featureId: 'guests',
    featureName: 'Guests',
    icon: Users,
    actions: [
      { id: 'view', label: "View Guest Details" },
      { id: 'add', label: "Add/Onboard New Guests" },
      { id: 'edit', label: "Edit Guest Info" },
      { id: 'delete', label: "Initiate/Finalize Exit" }
    ]
  },
  {
    featureId: 'finances',
    featureName: 'Financials',
    icon: CircleDollarSign,
    actions: [
      { id: 'view', label: "View Passbook & Expenses" },
      { id: 'add', label: "Collect Rent & Add Expenses" },
    ]
  },
  {
    featureId: 'complaints',
    featureName: 'Complaints',
    icon: MessageSquare,
    actions: [
      { id: 'view', label: "View Complaints" },
      { id: 'edit', label: "Update Complaint Status" },
      { id: 'add', label: "Raise a new complaint" },
      { id: 'delete', label: "Delete complaints or notices" }
    ]
  },
  {
    featureId: 'food',
    featureName: 'Food Menu',
    icon: Utensils,
    actions: [
      { id: 'view', label: "View Menu" },
      { id: 'edit', label: "Edit Menu" }
    ]
  },
  {
    featureId: 'staff',
    featureName: 'Staff Management',
    icon: UserCog,
    actions: [
      { id: 'view', label: "View Staff List" },
      { id: 'add', label: "Add New Staff" },
      { id: 'edit', label: "Edit Staff Details" },
      { id: 'delete', label: "Delete Staff" },
    ]
  },
  {
    featureId: 'website',
    featureName: 'Website Builder',
    icon: Globe,
    actions: [
      { id: 'view', label: "View Site Details" },
      { id: 'edit', label: "Edit & Publish Site" },
    ]
  },
  {
    featureId: 'seo',
    featureName: 'AI SEO Generator',
    icon: Zap,
    actions: [
      { id: 'use', label: "Use the AI SEO tool" },
    ]
  },
  {
    featureId: 'kyc',
    featureName: 'KYC Verification',
    icon: FileCheck,
    actions: [
      { id: 'view', label: 'View KYC Status & Docs' },
      { id: 'edit', label: 'Approve/Reject KYC' },
      { id: 'add', label: 'Request KYC from Tenant' },
    ],
  },
];
