import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  FolderIcon,
  DocumentTextIcon,
  ShareIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  CloudArrowUpIcon,
  MagnifyingGlassIcon,
  TagIcon,
  UsersIcon,
  ChartBarIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';

interface ContentItem {
  id: string;
  title: string;
  type: 'document' | 'video' | 'audio' | 'image' | 'presentation';
  size: number;
  uploadDate: string;
  lastModified: string;
  tags: string[];
  sharedWith: string[];
  views: number;
  downloads: number;
  category: string;
  description?: string;
}

interface Category {
  id: string;
  name: string;
  itemCount: number;
  color: string;
}

const ContentLibrary: React.FC = () => {
  const { user, currentRole } = useAuth();
  const [content, setContent] = useState<ContentItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'views'>('date');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Mock data for demonstration
  useEffect(() => {
    const mockCategories: Category[] = [
      { id: '1', name: 'Computer Science', itemCount: 15, color: 'bg-blue-500' },
      { id: '2', name: 'Mathematics', itemCount: 8, color: 'bg-green-500' },
      { id: '3', name: 'Physics', itemCount: 12, color: 'bg-purple-500' },
      { id: '4', name: 'Chemistry', itemCount: 6, color: 'bg-red-500' },
      { id: '5', name: 'General', itemCount: 10, color: 'bg-gray-500' }
    ];

    const mockContent: ContentItem[] = [
      {
        id: '1',
        title: 'Introduction to Machine Learning',
        type: 'document',
        size: 2048000,
        uploadDate: '2024-01-15',
        lastModified: '2024-01-15',
        tags: ['ML', 'AI', 'Fundamentals'],
        sharedWith: ['Class