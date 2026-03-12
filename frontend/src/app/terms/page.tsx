import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Separator } from '@/components/ui/separator';
import { APP_NAME } from '@/lib/constants';

function SectionHeading({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <h2
      id={id}
      className="mb-4 mt-12 scroll-mt-24 text-2xl font-bold tracking-tight first:mt-0"
    >
      {children}
    </h2>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2 mt-6 text-lg font-semibold">{children}</h3>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="mb-4 leading-relaxed text-muted-foreground">{children}</p>;
}

function Li({ children }: { children: React.ReactNode }) {
  return <li className="text-muted-foreground">{children}</li>;
}

export default function TermsPage() {
  const lastUpdated = 'March 1, 2026';

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        <section className="bg-gradient-to-b from-primary/5 to-transparent py-16 sm:py-20">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Legal &amp; Policies
            </h1>
            <p className="mt-3 text-muted-foreground">
              Last updated: {lastUpdated}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3 text-sm">
              <a href="#terms" className="rounded-full border border-border px-4 py-1.5 hover:bg-accent transition-colors">
                Terms of Service
              </a>
              <a href="#privacy" className="rounded-full border border-border px-4 py-1.5 hover:bg-accent transition-colors">
                Privacy Policy
              </a>
              <a href="#cookies" className="rounded-full border border-border px-4 py-1.5 hover:bg-accent transition-colors">
                Cookie Policy
              </a>
            </div>
          </div>
        </section>

        <article className="mx-auto max-w-3xl px-4 pb-20 sm:px-6">
          {/* TERMS OF SERVICE */}
          <SectionHeading id="terms">Terms of Service</SectionHeading>

          <P>
            Welcome to {APP_NAME} (&ldquo;Platform&rdquo;), a product of GSG BRANDS
            (&ldquo;Company,&rdquo; &ldquo;we,&rdquo; &ldquo;us&rdquo;). By accessing or using
            the Platform, you agree to be bound by these Terms of Service
            (&ldquo;Terms&rdquo;). If you do not agree, do not use the Platform.
          </P>

          <SubHeading>1. Eligibility</SubHeading>
          <P>
            You must be at least 18 years old and a legal resident of Ghana to use
            {' '}{APP_NAME}. By creating an account, you represent that all information
            provided is accurate and that you have the legal capacity to enter into
            binding agreements.
          </P>

          <SubHeading>2. How the Escrow Service Works</SubHeading>
          <P>
            {APP_NAME} acts as a neutral escrow intermediary between buyers and sellers.
            When a buyer initiates a transaction:
          </P>
          <ul className="mb-4 ml-6 list-disc space-y-1">
            <Li>Funds are collected via Paystack and held securely by the Platform.</Li>
            <Li>The seller is notified to dispatch the product.</Li>
            <Li>Upon confirmed delivery, funds are released to the seller and delivery rider (if applicable).</Li>
            <Li>Platform fees are deducted before payout.</Li>
          </ul>
          <P>
            We do not take ownership or possession of any goods. We are not a party
            to the underlying sale and bear no responsibility for product quality,
            authenticity, or condition unless a dispute is filed.
          </P>

          <SubHeading>3. Escrow Holds &amp; Disputes</SubHeading>
          <P>
            Funds remain in escrow until the buyer confirms delivery or a dispute is
            resolved. If the buyer does not confirm delivery within 72 hours of the
            delivery status being marked, the Platform may auto-release funds to the
            seller after review. Either party may open a dispute within 48 hours
            of delivery. The Platform will review evidence from both parties and
            make a binding resolution.
          </P>

          <SubHeading>4. Payouts</SubHeading>
          <P>
            Payouts are processed via mobile money (MTN, Vodafone Cash, AirtelTigo).
            Seller payouts are initiated automatically upon delivery confirmation.
            Failed payouts are retried up to 3 times. The Platform is not liable for
            delays caused by mobile money provider outages.
          </P>

          <SubHeading>5. Platform Fees</SubHeading>
          <P>
            The Platform charges a service fee on each transaction, displayed clearly
            to the buyer before payment. Fees are non-refundable once a transaction
            is completed. The current fee schedule is available on the transaction
            creation screen.
          </P>

          <SubHeading>6. Food vs. Non-Food Items</SubHeading>
          <P>
            Transactions involving food items are not eligible for replacement
            requests due to their perishable nature. Non-food items are eligible
            for one replacement request if the delivered item does not match the
            agreed description.
          </P>

          <SubHeading>7. Prohibited Activities</SubHeading>
          <ul className="mb-4 ml-6 list-disc space-y-1">
            <Li>Using the Platform for illegal goods or services.</Li>
            <Li>Creating fraudulent transactions or providing false information.</Li>
            <Li>Circumventing the escrow process (e.g., paying sellers directly after initiating).</Li>
            <Li>Attempting to exploit, hack, or interfere with Platform operations.</Li>
            <Li>Impersonating another user.</Li>
          </ul>

          <SubHeading>8. Account Suspension &amp; Termination</SubHeading>
          <P>
            We reserve the right to suspend or permanently ban accounts engaged in
            prohibited activities, repeated disputes in bad faith, or violation of
            these Terms. Funds in escrow during suspension will be handled on a
            case-by-case basis.
          </P>

          <SubHeading>9. Limitation of Liability</SubHeading>
          <P>
            To the maximum extent permitted by Ghanaian law, {APP_NAME} and GSG BRANDS
            shall not be liable for any indirect, incidental, consequential, or
            punitive damages arising from use of the Platform. Our total liability
            for any claim shall not exceed the total fees collected on the
            transaction in question.
          </P>

          <SubHeading>10. Governing Law</SubHeading>
          <P>
            These Terms are governed by and construed in accordance with the laws
            of the Republic of Ghana. Any disputes shall be resolved through
            arbitration in Accra, Ghana.
          </P>

          <SubHeading>11. Changes to Terms</SubHeading>
          <P>
            We may update these Terms at any time. Material changes will be
            communicated via SMS or in-app notification at least 14 days before
            taking effect. Continued use of the Platform constitutes acceptance
            of the revised Terms.
          </P>

          <Separator className="my-12" />

          {/* PRIVACY POLICY */}
          <SectionHeading id="privacy">Privacy Policy</SectionHeading>

          <P>
            GSG BRANDS (&ldquo;we,&rdquo; &ldquo;us&rdquo;) is committed to
            protecting the privacy of users of {APP_NAME}. This Privacy Policy
            explains how we collect, use, and safeguard your personal data.
          </P>

          <SubHeading>1. Information We Collect</SubHeading>
          <ul className="mb-4 ml-6 list-disc space-y-1">
            <Li><strong>Account Data:</strong> Phone number, full name, Ghana Card name (optional).</Li>
            <Li><strong>Transaction Data:</strong> Product details, prices, delivery addresses, seller and buyer phone numbers.</Li>
            <Li><strong>Financial Data:</strong> Mobile money details for payouts (processed via Paystack; we do not store card numbers).</Li>
            <Li><strong>Usage Data:</strong> IP address, browser type, pages visited, timestamps.</Li>
            <Li><strong>Communications:</strong> Dispute evidence, review content, support messages.</Li>
          </ul>

          <SubHeading>2. How We Use Your Data</SubHeading>
          <ul className="mb-4 ml-6 list-disc space-y-1">
            <Li>To facilitate escrow transactions and payouts.</Li>
            <Li>To verify identity and prevent fraud.</Li>
            <Li>To communicate transaction updates via SMS.</Li>
            <Li>To resolve disputes and enforce our Terms.</Li>
            <Li>To improve Platform performance and user experience.</Li>
          </ul>

          <SubHeading>3. Data Sharing</SubHeading>
          <P>
            We share data only when necessary: with Paystack for payment processing,
            with SMS providers for notifications, and with law enforcement when
            required by Ghanaian law. We never sell personal data to third parties.
          </P>

          <SubHeading>4. Data Retention</SubHeading>
          <P>
            Transaction and audit data is retained for a minimum of 5 years in
            compliance with financial regulations. Account data is retained for 12
            months after account deletion request, after which it is permanently
            removed.
          </P>

          <SubHeading>5. Security</SubHeading>
          <P>
            All data is encrypted in transit (TLS 1.3) and at rest (AES-256).
            Database access is protected by Row Level Security policies. We conduct
            regular security audits and maintain audit logs of all sensitive
            operations.
          </P>

          <SubHeading>6. Your Rights</SubHeading>
          <P>
            Under the Data Protection Act, 2012 (Act 843) of Ghana, you have the
            right to access, correct, or request deletion of your personal data.
            Contact us at privacy@gsgbrands.com to exercise these rights.
          </P>

          <Separator className="my-12" />

          {/* COOKIE POLICY */}
          <SectionHeading id="cookies">Cookie Policy</SectionHeading>

          <P>
            {APP_NAME} uses cookies and similar technologies to provide and improve
            the Platform. This Cookie Policy explains what cookies we use and why.
          </P>

          <SubHeading>1. Essential Cookies</SubHeading>
          <P>
            These cookies are necessary for the Platform to function. They include
            session tokens for authentication and security tokens to prevent
            cross-site request forgery. You cannot opt out of essential cookies
            as they are required for the service to operate.
          </P>

          <SubHeading>2. Analytics Cookies</SubHeading>
          <P>
            We use privacy-respecting analytics to understand how users navigate the
            Platform. These cookies collect aggregated, anonymous data such as page
            views and session duration. No personally identifiable information is
            tracked via analytics cookies.
          </P>

          <SubHeading>3. Managing Cookies</SubHeading>
          <P>
            You can control cookies through your browser settings. Blocking essential
            cookies may prevent you from using certain features of the Platform.
            Most browsers allow you to view, manage, and delete cookies under
            &ldquo;Settings&rdquo; or &ldquo;Privacy.&rdquo;
          </P>

          <SubHeading>4. Contact</SubHeading>
          <P>
            For questions about this Cookie Policy or our data practices, please
            contact us at legal@gsgbrands.com or call +233 XX XXX XXXX.
          </P>

          <Separator className="my-12" />

          <div className="rounded-2xl bg-muted/50 p-6 text-center text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Have Questions?</p>
            <p className="mt-1">
              Reach out to our support team at{' '}
              <a href="mailto:support@gsgbrands.com" className="text-primary hover:underline">
                support@gsgbrands.com
              </a>
              . We typically respond within 24 hours.
            </p>
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
}
