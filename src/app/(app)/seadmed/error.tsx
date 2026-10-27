"use client";

import { ErrorView } from "@/components/ErrorView";

export default function SectionError({ retry }: { error: unknown; retry: () => void }) {
  return <ErrorView retry={retry} />;
}
