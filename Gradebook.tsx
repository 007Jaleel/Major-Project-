// frontend/src/pages/teacher/Gradebook.tsx
import React from 'react';
import Layout from '../../components/Layout';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';

const Gradebook: React.FC = () => {
  return (
    <Layout>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Gradebook</CardTitle>
          </CardHeader>
          <CardContent>
            <p>This is where teachers can view and manage student grades.</p>
            {/* Add logic to display and manage the gradebook */}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Gradebook;
