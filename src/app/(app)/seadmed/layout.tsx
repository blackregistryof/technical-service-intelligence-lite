import { AppShell } from "@/components/AppShell";

// Protected section: proxy.ts redirects requests without a valid session, and
// every page and data access re-checks the session on the server with
// requireSession().
export default function SectionLayout({ children }: LayoutProps<"/seadmed">) {
  return <AppShell current="seadmed">{children}</AppShell>;
}
