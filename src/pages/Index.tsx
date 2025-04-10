
import { Layout } from "@/components/layout/Layout";
import { FileAttachmentDemo } from "@/components/FileAttachmentDemo";

const Index = () => {
  return (
    <Layout>
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-6 text-center">Proxy Guard Portal</h1>
        <div className="max-w-2xl mx-auto">
          <FileAttachmentDemo />
        </div>
      </div>
    </Layout>
  );
};

export default Index;
