import "./globals.css";
import { AppProvider } from "@/context/AppContext";
import Header from "@/components/Header/Header";
import Footer from "@/components/Footer/Footer";

export const metadata = {
  title: "FlipAmaz - Best E-Commerce Deals, Laptops & Mobile Offers",
  description: "Experience the fastest delivery and top brand selection with FlipAmaz. Discover best-in-class pricing, ratings, and features compiled from your favorite stores.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AppProvider>
          <Header />
          <main style={{ flex: "1 0 auto" }}>
            {children}
          </main>
          <Footer />
        </AppProvider>
      </body>
    </html>
  );
}
