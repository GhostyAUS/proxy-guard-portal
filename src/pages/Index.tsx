
import { Layout } from "@/components/layout/Layout";

const Index = () => {
  return (
    <Layout>
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-6 text-center">Proxy Guard Portal</h1>
        <div className="max-w-2xl mx-auto">
          <p className="text-center text-lg text-muted-foreground">
            Welcome to the Proxy Guard management portal. Use the sidebar to navigate to different sections.
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default Index;
