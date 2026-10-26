export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main
      id="sisu"
      className="flex w-full flex-1 items-center justify-center px-4 py-10 sm:px-6"
    >
      {children}
    </main>
  );
}
