
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PrivacyPolicyPage() {
  return (
    <div className="bg-muted/40 py-12">
      <div className="container mx-auto px-4">
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-3xl">Privacy Policy</CardTitle>
            <p className="text-muted-foreground">Last updated: August 01, 2024</p>
          </CardHeader>
          <CardContent className="prose dark:prose-invert max-w-none">
            <p>
              This Privacy Policy describes Our policies and procedures on the collection, use and disclosure of Your information when You use the Service and tells You about Your privacy rights and how the law protects You. We use Your Personal data to provide and improve the Service. By using the Service, You agree to the collection and use of information in accordance with this Privacy Policy.
            </p>
            
            <h2>Interpretation and Definitions</h2>
            <h3>Interpretation</h3>
            <p>
              The words of which the initial letter is capitalized have meanings defined under the following conditions. The following definitions shall have the same meaning regardless of whether they appear in singular or in plural.
            </p>
            <h3>Definitions</h3>
            <p>For the purposes of this Privacy Policy:</p>
            <ul>
              <li><strong>Account</strong> means a unique account created for You to access our Service or parts of our Service.</li>
              <li><strong>Company</strong> (referred to as either "the Company", "We", "Us" or "Our" in this Agreement) refers to RentSutra Technologies Pvt. Ltd.</li>
              <li><strong>Personal Data</strong> is any information that relates to an identified or identifiable individual.</li>
              <li><strong>Service</strong> refers to the Website.</li>
              <li><strong>You</strong> means the individual accessing or using the Service, or the company, or other legal entity on behalf of which such individual is accessing or using the Service, as applicable.</li>
            </ul>

            <h2>Collecting and Using Your Personal Data</h2>
            <h3>Types of Data Collected</h3>
            <h4>Personal Data</h4>
            <p>
              While using Our Service, We may ask You to provide Us with certain personally identifiable information that can be used to contact or identify You. Personally identifiable information may include, but is not limited to:
            </p>
            <ul>
              <li>Email address</li>
              <li>First name and last name</li>
              <li>Phone number</li>
              <li>Address, State, Province, ZIP/Postal code, City</li>
              <li>Usage Data</li>
            </ul>

            <h2>Use of Your Personal Data</h2>
            <p>The Company may use Personal Data for the following purposes:</p>
            <ul>
                <li><strong>To provide and maintain our Service</strong>, including to monitor the usage of our Service.</li>
                <li><strong>To manage Your Account:</strong> to manage Your registration as a user of the Service.</li>
                <li><strong>For the performance of a contract:</strong> the development, compliance and undertaking of the purchase contract for the products, items or services You have purchased or of any other contract with Us through the Service.</li>
                <li><strong>To contact You:</strong> To contact You by email, telephone calls, SMS, or other equivalent forms of electronic communication.</li>
            </ul>
            
            <h2>Contact Us</h2>
            <p>If you have any questions about this Privacy Policy, You can contact us:</p>
            <ul>
                <li>By email: hello@rentsutra.com</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
