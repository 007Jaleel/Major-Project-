// frontend/src/pages/parent/ChildProgress.tsx
import React from 'react';
import { useParams } from 'react-router-dom';
import Layout from '../../components/Layout';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';

const ChildProgress: React.FC = () => {
  const { childId } = useParams<{ childId: string }>();

  return (
    <Layout>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Child Progress - ID: {childId}</CardTitle>
          </CardHeader>
          <CardContent>
            <p>This is where parents can view their child's progress.</p>
            {/* Add logic to fetch and display child's progress */}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default ChildProgress;
