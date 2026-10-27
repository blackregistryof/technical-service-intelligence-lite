import { AppHeader } from "@/components/AppHeader";

// Pages in this group are protected: proxy.ts redirects requests without a
// valid session, and every page and data access re-checks the session on the
// server with requireSession().
export default function ProtectedLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <AppHeader />
      <main
        id="sisu"
        className="mx-auto w-full max-w-[90rem] flex-1 px-4 py-6 sm:px-6 lg:px-8"
      >
        {children}
      </main>
    </>
  );
}
