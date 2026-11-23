import { ContentHeader } from "@/components/admin/content-header";

export default function ContentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6">
      <ContentHeader />
      {children}
    </div>
  );
}
