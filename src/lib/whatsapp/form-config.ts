export type FormFieldType = 'text' | 'number' | 'email' | 'date' | 'select';

export interface FormFieldDefinition {
    id: string;
    type: FormFieldType;
    prompt: string;
    label: string;
    placeholder?: string;
    options?: { value: string; label: string }[];
    required: boolean;
    validationRegex?: RegExp;
    validationErrorMsg?: string;
}

export const ADD_TENANT_FORM: FormFieldDefinition[] = [
    {
        id: 'name',
        type: 'text',
        prompt: 'What is the full name?',
        label: 'Full Name',
        required: true
    },
    {
        id: 'phone',
        type: 'text',
        prompt: 'What is their 10-digit phone number?',
        label: 'Phone Number',
        required: true,
        validationRegex: /^\\d{10}$/,
        validationErrorMsg: 'Please enter a valid 10-digit number. Try again:'
    },
    {
        id: 'email',
        type: 'email',
        prompt: 'What is their email address? (Reply "skip" to leave blank)',
        label: 'Email Address',
        required: false
    },
    {
        id: 'rentAmount',
        type: 'number',
        prompt: 'What is the monthly rent? (e.g. 12000)',
        label: 'Monthly Rent',
        required: true,
        validationRegex: /^\\d+$/,
        validationErrorMsg: 'Please enter a valid amount in digits (e.g. 12000). Try again:'
    },
    {
        id: 'depositAmount',
        type: 'number',
        prompt: 'What is the security deposit amount? (e.g. 12000)',
        label: 'Security Deposit',
        required: true,
        validationRegex: /^\\d+$/,
        validationErrorMsg: 'Please enter a valid amount in digits. Try again:'
    },
    {
        id: 'rentCycleUnit',
        type: 'select',
        prompt: 'What is the rent cycle? Reply with:\\n1 = Months\\n2 = Weeks\\n3 = Days\\n4 = Hours\\n5 = Minutes',
        label: 'Rent Cycle Unit',
        options: [
            { value: 'months', label: 'Months' },
            { value: 'weeks', label: 'Weeks' },
            { value: 'days', label: 'Days' },
            { value: 'hours', label: 'Hours (Testing)' },
            { value: 'minutes', label: 'Minutes (Testing)' }
        ],
        required: true
    },
    {
        id: 'rentCycleValue',
        type: 'number',
        prompt: 'What is the duration of the cycle? (e.g. 1 for every 1 month)',
        label: 'Cycle Duration',
        required: true,
        validationRegex: /^\\d+$/,
        validationErrorMsg: 'Please enter a valid numeric duration (e.g. 1). Try again:'
    },
];

export const ADD_PROPERTY_FORM: FormFieldDefinition[] = [
    {
        id: 'name',
        type: 'text',
        prompt: '🏠 What is the property name?\n(e.g., "Sharma PG", "Downtown Hostel")',
        label: 'Property Name',
        required: true
    },
    {
        id: 'totalBeds',
        type: 'number',
        prompt: 'How many beds/rooms does it have?\n(e.g., 10, 20)',
        label: 'Total Beds',
        required: true,
        validationRegex: /^\\d+$/,
        validationErrorMsg: 'Please enter a valid number (e.g., 10). Try again:'
    },
    {
        id: 'location',
        type: 'text',
        prompt: 'What is the location/address?\n(e.g., "Block D, Sector 45")',
        label: 'Location',
        required: true
    },
    {
        id: 'baseRent',
        type: 'number',
        prompt: 'What is the base rent amount?\n(e.g., 5000)',
        label: 'Base Rent',
        required: true,
        validationRegex: /^\\d+$/,
        validationErrorMsg: 'Please enter a valid amount (e.g., 5000). Try again:'
    },
    {
        id: 'securityDepositPercent',
        type: 'number',
        prompt: 'Security deposit (%)?\n(e.g., 30 for 30% of rent)',
        label: 'Security Deposit %',
        required: true,
        validationRegex: /^\\d+$/,
        validationErrorMsg: 'Please enter a valid percentage (e.g., 30). Try again:'
    },
];
