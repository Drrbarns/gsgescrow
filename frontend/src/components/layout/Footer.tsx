import Link from 'next/link';
import { Shield } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2 font-bold text-lg mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Shield className="h-4 w-4" />
              </div>
              Sell-Safe Buy-Safe
            </div>
            <p className="text-sm text-muted-foreground">
              Secure every online transaction. A GSG BRANDS product.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-3 text-sm uppercase tracking-wider">Platform</h3>
            <nav className="flex flex-col gap-2">
              <Link href="/hub" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Transaction Hub</Link>
              <Link href="/tracking" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Track Order</Link>
              <Link href="/calculator" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Fee Calculator</Link>
              <Link href="/reviews" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Reviews</Link>
            </nav>
          </div>

          <div>
            <h3 className="font-semibold mb-3 text-sm uppercase tracking-wider">Get Started</h3>
            <nav className="flex flex-col gap-2">
              <Link href="/buyer/step-1" className="text-sm text-muted-foreground hover:text-foreground transition-colors">I&apos;m a Buyer</Link>
              <Link href="/seller/step-1" className="text-sm text-muted-foreground hover:text-foreground transition-colors">I&apos;m a Seller</Link>
              <Link href="/seller/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Seller Dashboard</Link>
              <Link href="/seller/embed" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Get Your Trust Badge</Link>
            </nav>
          </div>

          <div>
            <h3 className="font-semibold mb-3 text-sm uppercase tracking-wider">Resources</h3>
            <nav className="flex flex-col gap-2">
              <Link href="/protection" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Buyer Protection</Link>
              <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Terms of Service</Link>
              <Link href="/terms#privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</Link>
            </nav>
          </div>
        </div>

        <div className="mt-10 border-t border-border/40 pt-6 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} GSG BRANDS. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
