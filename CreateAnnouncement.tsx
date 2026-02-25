import React from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';

import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';

interface AnnouncementForm {
  title: string;
  content: string;
}

const CreateAnnouncement: React.FC = () => {
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm<AnnouncementForm>();

  const onSubmit = async (data: AnnouncementForm) => {
    try {
      // Use relative API URL so Vite proxy + axios baseURL work consistently.
      // Auth header is already injected via axios interceptor in src/main.tsx.
      const response = await axios.post('/api/v1/announcements', data);
      toast.success('Announcement created successfully!');
      console.log('Announcement created:', response.data);
      navigate('/teacher/dashboard'); // Or wherever appropriate
    } catch (error) {
      toast.error('Failed to create announcement.');
      console.error('Error creating announcement:', error);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-foreground">Create New Announcement</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <Label htmlFor="title" className="text-foreground">Title</Label>
          <Input
            id="title"
            {...register('title', { required: 'Title is required' })}
            className="mt-1 block w-full"
          />
          {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>}
        </div>
        <div>
          <Label htmlFor="content" className="text-foreground">Content</Label>
          <Textarea
            id="content"
            {...register('content', { required: 'Content is required' })}
            className="mt-1 block w-full"
            rows={5}
          />
          {errors.content && <p className="text-red-500 text-sm mt-1">{errors.content.message}</p>}
        </div>
        <Button type="submit" className="w-full">
          Create Announcement
        </Button>
      </form>
    </div>
  );
};

export default CreateAnnouncement;