import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Breadcrumb from '../../../components/ui/Breadcrumb';

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('Breadcrumb Component', () => {
  it('renders breadcrumb items correctly', () => {
    const items = [
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Class 1', href: '/class/1' },
      { label: 'Sessions', current: true }
    ];

    renderWithRouter(<Breadcrumb items={items} />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Class 1')).toBeInTheDocument();
    expect(screen.getByText('Sessions')).toBeInTheDocument();
  });

  it('shows home icon when showHome is true', () => {
    const items = [
      { label: 'Class 1', current: true }
    ];

    renderWithRouter(<Breadcrumb items={items} showHome={true} />);

    expect(screen.getByLabelText('Dashboard')).toBeInTheDocument();
  });

  it('hides home icon when showHome is false', () => {
    const items = [
      { label: 'Class 1', current: true }
    ];

    renderWithRouter(<Breadcrumb items={items} showHome={false} />);

    expect(screen.queryByLabelText('Dashboard')).not.toBeInTheDocument();
  });

  it('handles empty items array', () => {
    const { container } = renderWithRouter(<Breadcrumb items={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('marks current item with aria-current', () => {
    const items = [
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Current Page', current: true }
    ];

    renderWithRouter(<Breadcrumb items={items} />);

    const currentItem = screen.getByText('Current Page');
    expect(currentItem).toHaveAttribute('aria-current', 'page');
  });
});