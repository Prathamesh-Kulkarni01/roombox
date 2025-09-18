import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Using AI-Powered Tools on RentSutra | RentSutra Guide',
  description: 'Learn how to leverage RentSutra\'s AI tools for generating rent reminders, creating SEO content for listings, and answering tenant queries with a chatbot.',
};

export default function AiToolsGuide() {
  return (
    <>
      <h1>Using AI-Powered Tools</h1>
      <p className="lead">RentSutra integrates powerful AI to automate and improve your daily operations. Here's how to use the key AI features available in the Pro plan.</p>

      <h2>1. AI Rent Reminders</h2>
      <p>Stop manually typing out rent reminder messages. Let our AI do it for you.</p>
      <ol>
        <li>On the dashboard, click on a guest whose rent is due.</li>
        <li>In the popover, click "Send Reminder".</li>
        <li>An AI-generated message will instantly appear, personalized with the guest's name, amount due, and your PG's name. It also includes a secure payment link.</li>
        <li>You can copy the message or send it directly via WhatsApp.</li>
      </ol>

      <h2>2. AI SEO Content Generator</h2>
      <p>Attract more tenants by creating professional online listings. This tool helps you write SEO-friendly titles and descriptions.</p>
      <ol>
        <li>Navigate to the "AI SEO" page from the sidebar.</li>
        <li>Fill in the basic details of your property: Name, Location, Amenities, Price, and Gender restrictions.</li>
        <li>Click "Generate Content".</li>
        <li>The AI will produce a compelling title and a detailed, keyword-rich description perfect for platforms like 99acres, MagicBricks, or Facebook.</li>
      </ol>
      
      <h2>3. AI Tenant Chatbot</h2>
      <p>Reduce your support workload by letting an AI handle common tenant questions. Your tenants can access this feature in their app.</p>
      <ul>
        <li><strong>What it does:</strong> The chatbot can answer questions about house rules, meal times, the food menu, and available amenities.</li>
        <li><strong>How it works:</strong> The AI uses the information you've already entered into RentSutra (your rules, your menu) as its source of knowledge.</li>
        <li><strong>Your role:</strong> Simply keep your property details up-to-date, and the chatbot will do the rest!</li>
      </ul>

      <h2>4. Automated KYC Verification</h2>
      <p>Secure your property by verifying tenant identities with AI.</p>
       <ol>
        <li>When a tenant uploads their ID document and a selfie, our AI gets to work.</li>
        <li>It automatically checks if the document is a valid ID and if the selfie matches the photo on the ID.</li>
        <li>You get a clear "Verified" or "Rejected" status on the guest's profile, saving you the manual effort of comparison.</li>
      </ol>

      <h2>Video Tutorial</h2>
      <p>Watch this video to see our AI tools in action:</p>
      <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
          <p className="text-muted-foreground">(YouTube video embed placeholder)</p>
      </div>
    </>
  );
}
