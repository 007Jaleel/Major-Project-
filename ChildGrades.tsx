// frontend/src/pages/parent/ChildGrades.tsx
import React from 'react';
import Layout from '../../components/Layout';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';

const ChildGrades: React.FC = () => {
  return (
    <Layout>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Child's Grades</CardTitle>
          </CardHeader>
          <CardContent>
            <p>This is where parents can view their child's grades.</p>
            {/* Add logic to fetch and display child's grades */}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default ChildGrades;
