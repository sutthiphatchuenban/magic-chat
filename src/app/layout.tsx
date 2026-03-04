import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import './globals.css';

const outfit = Outfit({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Magical Chat',
  description: 'A magical AI assistant from the wizarding world.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script src="https://code.responsivevoice.org/responsivevoice.js?key=6AqfG4Hm" defer />
      </head>
      <body className={`${outfit.className} antialiased`}>
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Force stop all speech on page unload
                if (typeof window !== 'undefined') {
                  window.addEventListener('beforeunload', function() {
                    if (window.responsiveVoice) {
                      window.responsiveVoice.cancel();
                    }
                    if (window.speechSynthesis) {
                      window.speechSynthesis.cancel();
                    }
                  });
                  // Also stop when page is hidden
                  document.addEventListener('visibilitychange', function() {
                    if (document.hidden) {
                      if (window.responsiveVoice) {
                        window.responsiveVoice.cancel();
                      }
                      if (window.speechSynthesis) {
                        window.speechSynthesis.cancel();
                      }
                    }
                  });
                }
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}
