import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'How to Use the Expense Tracker | RentSutra Guide',
  description: 'A guide on how to effectively log, categorize, and track all your property-related expenses using the RentSutra expense management tool.',
};

export default function ExpenseTrackingGuide() {
  return (
    <>
      <h1>How to Use the Expense Tracker</h1>
      <p className="lead">Keeping track of your expenses is crucial for understanding your profitability. RentSutra makes it simple to log every rupee spent.</p>

      <h2>Step 1: Navigate to the Expenses Page</h2>
      <p>From the main sidebar, click on "Expenses". This page provides a summary of your monthly expenses and a log of recent transactions.</p>

      <h2>Step 2: Add a New Expense</h2>
      <p>You have two ways to add an expense:</p>
      <ul>
        <li><strong>Manual Entry:</strong> Click the "Add Expense" button to open a dialog. Here you can specify the property, category, amount, description, and date.</li>
        <li><strong>Quick Add:</strong> Use the "Quick Add" buttons for common, recurring expenses like "Water Bill" or "Groceries". This pre-fills the category and description for you, saving you time.</li>
      </ul>

      <h2>Step 3: Fill in Expense Details</h2>
      <ol>
        <li><strong>Property:</strong> Select which of your properties this expense is for.</li>
        <li><strong>Category:</strong> Choose a category like Food, Maintenance, Utilities, or Salary.</li>
        <li><strong>Amount:</strong> Enter the total amount spent.</li>
        <li><strong>Description:</strong> Add a brief note for your records (e.g., "Electricity bill for June").</li>
        <li><strong>Date:</strong> The date the expense was incurred.</li>
      </ol>
      <p>Once you save the expense, it will be added to your log and the monthly summary on the Expense dashboard will be updated instantly.</p>

      <h2>Step 4: View Summaries</h2>
      <p>The Expense dashboard provides cards that show your total expenses for the current month, broken down by major categories. This helps you see where your money is going at a glance.</p>
      
      <h2>Video Tutorial</h2>
      <p>Watch this video to learn how to manage your expenses with RentSutra:</p>
      <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
          <p className="text-muted-foreground">(YouTube video embed placeholder)</p>
      </div>
    </>
  );
}
