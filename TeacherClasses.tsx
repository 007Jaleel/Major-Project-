// frontend/src/pages/teacher/TeacherClasses.tsx
import React from 'react';
import Layout from '../../components/Layout';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';

const TeacherClasses: React.FC = () => {
  return (
    <Layout>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>My Classes</CardTitle>
          </CardHeader>
          <CardContent>
            <p>This is where the teacher's classes will be listed.</p>
            {/* Add logic to fetch and display classes */}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default TeacherClasses;
