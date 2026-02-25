// frontend/src/pages/admin/StudentGradesDetailPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import apiClient from '../../lib/apiClient';

interface Student {
  id: number;
  name: string;
  branch: string;
  semester: number;
}

interface Subject {
  id: number;
  code: string;
  name: string;
  credits: number;
  grade: string | null;
}

interface Semester {
  semester: number;
  subjects: Subject[];
}

const StudentGradesDetailPage: React.FC = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const [student, setStudent] = useState<Student | null>(null);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [editedGrades, setEditedGrades] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const fetchGrades = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.get(`/admin/students/${studentId}/grades`);
      setStudent(response.data.student);
      setSemesters(response.data.semesters);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch grades');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGrades();
  }, [studentId]);

  const handleGradeChange = (subjectId: number, semester: number, grade: string) => {
    setEditedGrades(prev => ({ ...prev, [`${subjectId}-${semester}`]: grade }));
  };

  const handleSaveChanges = async () => {
    setLoading(true);
    setError('');
    try {
      const gradesToUpdate = Object.entries(editedGrades).map(([key, grade]) => {
        const [subjectId, semester] = key.split('-').map(Number);
        return { subjectId, semester, grade };
      });
      await apiClient.put(`/admin/students/${studentId}/grades`, { grades: gradesToUpdate });
      setEditedGrades({});
      // Optionally, show a success toast/message
      alert('Grades updated successfully!');
      fetchGrades(); // Re-fetch to show updated data
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save grades');
    } finally {
      setLoading(false);
    }
  };

  const gradeOptions = ['O', 'A+', 'A', 'B+', 'B', 'C', 'P', 'F'];

  if (loading) {
    return <Layout><div className="text-center">Loading...</div></Layout>;
  }

  if (error) {
    return <Layout><div className="text-red-500 text-center">{error}</div></Layout>;
  }

  return (
    <Layout>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Manage Grades for {student?.name}</CardTitle>
          </CardHeader>
          <CardContent>
            {semesters.map(semester => (
              <div key={semester.semester} className="mb-8">
                <h3 className="text-xl font-bold mb-4">Semester {semester.semester}</h3>
                {semester.subjects.length === 0 ? (
                  <p>No subjects configured for this semester in Manage Subjects.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Subject</TableHead>
                        <TableHead>Credits</TableHead>
                        <TableHead>Grade</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {semester.subjects.map(subject => (
                        <TableRow key={subject.id}>
                          <TableCell>{subject.name} ({subject.code})</TableCell>
                          <TableCell>{subject.credits}</TableCell>
                          <TableCell>
                            <Select
                              value={editedGrades[`${subject.id}-${semester.semester}`] || subject.grade || ''}
                              onValueChange={(value) => handleGradeChange(subject.id, semester.semester, value)}
                            >
                              <SelectTrigger className="w-45">
                                <SelectValue placeholder="Select Grade" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="">No Grade</SelectItem>
                                {gradeOptions.map(grade => (
                                  <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            ))}
            <div className="flex justify-end space-x-4 mt-8">
              <Button variant="outline" onClick={() => navigate('/admin/grades')}>Back to Student List</Button>
              <Button onClick={handleSaveChanges} disabled={Object.keys(editedGrades).length === 0}>
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default StudentGradesDetailPage;
