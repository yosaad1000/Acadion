---
layout: default
title: Contributing
nav_order: 6
---

# 🤝 Contributing to Acadion

We welcome contributions from the community! Whether you're fixing bugs, adding features, improving documentation, or helping with translations, your contributions are valued.

## Getting Started

### Prerequisites

- **Git** for version control
- **Docker & Docker Compose** for development environment
- **Node.js 16+** and **Python 3.8+** for local development
- **GitHub account** for submitting contributions

### Development Setup

1. **Fork the Repository**
   - Go to [https://github.com/yosaad1000/Acadion](https://github.com/yosaad1000/Acadion)
   - Click "Fork" to create your own copy

2. **Clone Your Fork**
```bash
git clone https://github.com/yosaad1000/Acadion.git
cd Acadion
git remote add upstream https://github.com/yosaad1000/Acadion.git
```

3. **Set Up Development Environment**
```bash
# Copy environment template
cp backend/.env.example backend/.env

# Start development environment
docker-compose up -d

# Or run locally
cd backend && python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload

cd ../frontend && npm install && npm run dev
```

## How to Contribute

### 🐛 Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates.

**Good Bug Report Includes:**
- Clear, descriptive title
- Steps to reproduce the issue
- Expected vs actual behavior
- Screenshots or error messages
- Environment details (OS, browser, versions)

**Bug Report Template:**
```markdown
**Bug Description**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected Behavior**
What you expected to happen.

**Screenshots**
If applicable, add screenshots.

**Environment:**
- OS: [e.g. Windows 10, macOS 12.0, Ubuntu 20.04]
- Browser: [e.g. Chrome 96, Firefox 95, Safari 15]
- Version: [e.g. v2.0.0]

**Additional Context**
Any other context about the problem.
```

### ✨ Suggesting Features

We love feature suggestions! Please provide:

- **Clear use case** - Why is this feature needed?
- **Detailed description** - How should it work?
- **Mockups or examples** - Visual aids help a lot
- **Implementation ideas** - Technical approach (optional)

### 🔧 Code Contributions

#### Branch Naming Convention

- `feature/description` - New features
- `bugfix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring
- `test/description` - Test improvements

#### Development Workflow

1. **Create a Branch**
```bash
git checkout -b feature/awesome-new-feature
```

2. **Make Your Changes**
   - Follow coding standards (see below)
   - Add tests for new functionality
   - Update documentation as needed

3. **Test Your Changes**
```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm test

# Integration tests
docker-compose -f docker-compose.test.yml up --abort-on-container-exit
```

4. **Commit Your Changes**
```bash
git add .
git commit -m "feat: add awesome new feature

- Implement feature X
- Add tests for feature X
- Update documentation"
```

5. **Push and Create Pull Request**
```bash
git push origin feature/awesome-new-feature
```

Then create a Pull Request on GitHub.

## Coding Standards

### Python (Backend)

#### Code Style
- Follow **PEP 8** style guide
- Use **Black** for code formatting
- Use **isort** for import sorting
- Maximum line length: 88 characters

```bash
# Format code
black .
isort .

# Check style
flake8 .
mypy .
```

#### Code Structure
```python
# Good: Clear function with type hints and docstring
async def create_subject(
    subject_data: CreateSubjectRequest,
    current_user: User = Depends(get_current_user)
) -> Subject:
    """
    Create a new subject/class.
    
    Args:
        subject_data: Subject creation data
        current_user: Authenticated user
        
    Returns:
        Created subject object
        
    Raises:
        HTTPException: If user lacks permissions
    """
    if current_user.role != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can create subjects")
    
    # Implementation here
    return created_subject
```

#### Testing
```python
# test_subjects.py
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_create_subject():
    """Test subject creation with valid data."""
    response = client.post(
        "/api/subjects",
        json={"name": "Test Subject", "description": "Test Description"},
        headers={"Authorization": "Bearer valid_token"}
    )
    assert response.status_code == 201
    assert response.json()["name"] == "Test Subject"
```

### TypeScript/React (Frontend)

#### Code Style
- Use **Prettier** for formatting
- Use **ESLint** for linting
- Prefer **functional components** with hooks
- Use **TypeScript** strictly (no `any` types)

```bash
# Format and lint
npm run format
npm run lint
npm run type-check
```

#### Component Structure
```typescript
// Good: Well-structured React component
import React, { useState, useEffect } from 'react';
import { Subject } from '../types/subject';
import { subjectService } from '../services/subjects';

interface SubjectListProps {
  userId: string;
  onSubjectSelect: (subject: Subject) => void;
}

export const SubjectList: React.FC<SubjectListProps> = ({
  userId,
  onSubjectSelect
}) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const data = await subjectService.getUserSubjects(userId);
        setSubjects(data);
      } catch (err) {
        setError('Failed to load subjects');
      } finally {
        setLoading(false);
      }
    };

    fetchSubjects();
  }, [userId]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="subject-list">
      {subjects.map(subject => (
        <SubjectCard
          key={subject.id}
          subject={subject}
          onClick={() => onSubjectSelect(subject)}
        />
      ))}
    </div>
  );
};
```

#### Testing
```typescript
// SubjectList.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { SubjectList } from './SubjectList';
import { subjectService } from '../services/subjects';

jest.mock('../services/subjects');

describe('SubjectList', () => {
  it('renders subjects correctly', async () => {
    const mockSubjects = [
      { id: '1', name: 'Math 101', description: 'Basic Math' }
    ];
    
    (subjectService.getUserSubjects as jest.Mock).mockResolvedValue(mockSubjects);

    render(<SubjectList userId="123" onSubjectSelect={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Math 101')).toBeInTheDocument();
    });
  });
});
```

### Database Migrations

#### Migration File Structure
```sql
-- migrations/003_add_attendance_analytics.sql
-- Description: Add analytics tables for attendance tracking
-- Author: Your Name
-- Date: 2024-01-15

-- Create analytics table
CREATE TABLE attendance_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_students INTEGER NOT NULL,
    present_count INTEGER NOT NULL,
    attendance_rate DECIMAL(5,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_attendance_analytics_subject_date 
ON attendance_analytics(subject_id, date);

-- Add RLS policies
ALTER TABLE attendance_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can view their subject analytics" 
ON attendance_analytics FOR SELECT 
USING (
    subject_id IN (
        SELECT id FROM subjects 
        WHERE teacher_id = auth.uid()
    )
);
```

## Documentation

### Writing Documentation

- Use **clear, concise language**
- Include **code examples** where helpful
- Add **screenshots** for UI features
- Keep **table of contents** updated
- Use **proper markdown formatting**

### Documentation Types

1. **API Documentation** - Auto-generated from code
2. **User Guides** - How to use features
3. **Developer Guides** - Technical implementation
4. **Architecture Docs** - System design
5. **Deployment Guides** - Setup instructions

## Pull Request Process

### Before Submitting

- [ ] Code follows style guidelines
- [ ] Tests pass locally
- [ ] Documentation updated
- [ ] No merge conflicts
- [ ] Commit messages are clear

### Pull Request Template

```markdown
## Description
Brief description of changes made.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Screenshots (if applicable)
Add screenshots to help explain your changes.

## Checklist
- [ ] My code follows the style guidelines
- [ ] I have performed a self-review of my code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
```

### Review Process

1. **Automated Checks** - CI/CD pipeline runs tests
2. **Code Review** - Maintainers review code quality
3. **Testing** - Manual testing of new features
4. **Documentation** - Check if docs need updates
5. **Approval** - At least one maintainer approval required

## Community Guidelines

### Code of Conduct

We are committed to providing a welcoming and inspiring community for all. Please:

- **Be respectful** and inclusive
- **Be collaborative** and constructive
- **Be patient** with newcomers
- **Focus on what's best** for the community
- **Show empathy** towards other community members

### Communication Channels

- **GitHub Issues** - Bug reports and feature requests
- **GitHub Discussions** - General questions and ideas
- **Pull Requests** - Code contributions and reviews
- **Discord** - Real-time community chat (coming soon)

## Recognition

### Contributors

All contributors are recognized in:
- **README.md** contributors section
- **GitHub contributors** page
- **Release notes** for significant contributions

### Contribution Types

We recognize various types of contributions:
- 💻 **Code** - Bug fixes, features, refactoring
- 📖 **Documentation** - Guides, API docs, tutorials
- 🎨 **Design** - UI/UX improvements, graphics
- 🐛 **Bug Reports** - Finding and reporting issues
- 💡 **Ideas** - Feature suggestions and feedback
- 🌍 **Translation** - Internationalization support
- 📢 **Outreach** - Talks, blog posts, tutorials

## Getting Help

### For Contributors

- **GitHub Discussions** - Ask questions
- **Discord** - Real-time help (coming soon)
- **Documentation** - Check existing guides
- **Issues** - Search for similar problems

### For Maintainers

If you're interested in becoming a maintainer:
1. **Consistent contributions** over time
2. **Good understanding** of the codebase
3. **Helpful** to other contributors
4. **Follows** project guidelines

## Development Tips

### Useful Commands

```bash
# Backend development
cd backend
python -m pytest --cov=app tests/  # Run tests with coverage
black . && isort .                  # Format code
mypy .                             # Type checking

# Frontend development
cd frontend
npm test -- --coverage            # Run tests with coverage
npm run lint:fix                   # Fix linting issues
npm run type-check                 # TypeScript checking

# Docker development
docker-compose up -d               # Start services
docker-compose logs -f backend     # View backend logs
docker-compose exec backend bash  # Access backend container
```

### Debugging

```bash
# Backend debugging
docker-compose exec backend python -c "
from app.services.supabase_client import supabase
print(supabase.table('users').select('*').limit(1).execute())
"

# Frontend debugging
# Use browser dev tools and React Developer Tools
```

Thank you for contributing to Acadion! Your efforts help make education technology better for everyone. 🎓✨