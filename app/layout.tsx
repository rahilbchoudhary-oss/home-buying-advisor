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
      </body>
    </html>
  );
}
