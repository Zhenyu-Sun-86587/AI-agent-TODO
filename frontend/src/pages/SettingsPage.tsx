import { FileText } from "lucide-react";
import PageHeading from "./PageHeading";

export default function SettingsPage() {
  return (
    <main className="page-content">
      <PageHeading title="设置" />
      <section className="content-card empty-module">
        <FileText size={32} />
        <h2>设置</h2>
        <p>这里会承载项目的扩展能力，例如个人设置和更多 AI 工作流。</p>
      </section>
    </main>
  );
}
