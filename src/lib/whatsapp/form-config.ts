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
