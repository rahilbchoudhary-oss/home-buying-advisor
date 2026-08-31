import "./globals.css";
import Link from "next/link";

export const metadata = {
  title: "Home Buying Advisor",
  description: "Smarter Choices. A Better Home.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta
          name="cuelinks-verification"
          content="VERIFY-CL-W0JB8HSP"
        />
      </head>

      <body>
        <header className="nav">
          <div className="container navin">

            <Link
              className="logo"
              href="/"
              aria-label="Home Buying Advisor"
            >
              <img
                src="/logo.png"
                alt="Home Buying Advisor"
              />
            </Link>

            <nav>
              <Link href="/#how">
                How it works
              </Link>

              <Link href="/#why">
                Why us
              </Link>
            </nav>

            <Link
              className="button primary"
              href="/ac-advisor"
            >
              Find my AC
            </Link>

          </div>
        </header>

        {children}

        {/* Cuelinks JavaScript */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              var cId = '315432';

              (function(d, t) {
                var s = document.createElement('script');
                s.type = 'text/javascript';
                s.async = true;
                s.src = (document.location.protocol == 'https:' ? 'https://cdn0.cuelinks.com/js/' : 'http://cdn0.cuelinks.com/js/') + 'cuelinksv2.js';
                document.getElementsByTagName('body')[0].appendChild(s);
              }());
            `,
          }}
        />
      </body>
    </html>
  );
}
