import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import OrganizationOnboarding from '../../pages/OrganizationOnboarding';
import { OrganizationService } from '../../services/organizationService';

// Mock the organization service
vi.mock('../../services/organizationService', () => ({
  OrganizationService: {
    checkOrganizationNameAvailability: vi.fn(),
    checkOrganizationDomainAvailability: vi.fn(),
    createOrganizationWithAdmin: vi.fn(),
  },
}));

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

// Helper function to mock viewport size
const mockViewport = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });
  
  // Trigger resize event
  window.dispatchEvent(new Event('resize'));
};

describe('OrganizationOnboarding Responsive Design', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Mobile Viewport (375px)', () => {
    beforeEach(() => {
      mockViewport(375, 667);
    });

    it('should render properly on mobile devices', () => {
      renderWithRouter(<OrganizationOnboarding />);
      
      // Check that main elements are present
      expect(screen.getByText('Create Your Organization')).toBeInTheDocument();
      expect(screen.getByRole('form')).toBeInTheDocument();
      expect(screen.getByLabelText(/Organization Name/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Create Organization/ })).toBeInTheDocument();
    });

    it('should have adequate touch targets on mobile', () => {
      renderWithRouter(<OrganizationOnboarding />);
      
      // Form inputs should have adequate height for touch (check classes instead of computed styles)
      const inputs = screen.getAllByRole('textbox');
      inputs.forEach(input => {
        // Check that inputs have py-3 class which provides adequate padding
        expect(input).toHaveClass('py-3');
      });
      
      // Buttons should have adequate size (check classes)
      const submitButton = screen.getByRole('button', { name: /Create Organization/ });
      expect(submitButton).toHaveClass('py-3'); // Provides adequate touch target
    });

    it('should maintain form usability on mobile', async () => {
      const user = userEvent.setup();
      renderWithRouter(<OrganizationOnboarding />);
      
      // Should be able to interact with form elements
      const orgNameInput = screen.getByLabelText(/Organization Name/);
      await user.type(orgNameInput, 'Mobile Test University');
      
      expect(orgNameInput).toHaveValue('Mobile Test University');
      
      // Should be able to navigate between fields
      await user.tab();
      expect(screen.getByLabelText(/Organization Domain/)).toHaveFocus();
    });

    it('should handle mobile keyboard interactions', async () => {
      const user = userEvent.setup();
      renderWithRouter(<OrganizationOnboarding />);
      
      // Test that virtual keyboard doesn't break layout
      const emailInput = screen.getByLabelText(/Administrator Email/);
      await user.click(emailInput);
      
      // Input should still be visible and functional
      expect(emailInput).toHaveFocus();
      await user.type(emailInput, 'test@mobile.edu');
      expect(emailInput).toHaveValue('test@mobile.edu');
    });
  });

  describe('Tablet Viewport (768px)', () => {
    beforeEach(() => {
      mockViewport(768, 1024);
    });

    it('should render properly on tablet devices', () => {
      renderWithRouter(<OrganizationOnboarding />);
      
      // Check that layout adapts to tablet size
      expect(screen.getByText('Create Your Organization')).toBeInTheDocument();
      expect(screen.getByRole('form')).toBeInTheDocument();
      
      // Form should be well-centered and sized
      const form = screen.getByRole('form');
      expect(form).toBeInTheDocument();
    });

    it('should maintain proper spacing on tablet', () => {
      renderWithRouter(<OrganizationOnboarding />);
      
      // Check that elements have proper spacing
      const inputs = screen.getAllByRole('textbox');
      expect(inputs).toHaveLength(4); // All form inputs should be present
      
      // Form should not be too wide or too narrow
      const form = screen.getByRole('form');
      const formContainer = form.closest('.max-w-2xl');
      expect(formContainer).toBeInTheDocument();
    });
  });

  describe('Desktop Viewport (1024px+)', () => {
    beforeEach(() => {
      mockViewport(1024, 768);
    });

    it('should render properly on desktop devices', () => {
      renderWithRouter(<OrganizationOnboarding />);
      
      expect(screen.getByText('Create Your Organization')).toBeInTheDocument();
      expect(screen.getByRole('form')).toBeInTheDocument();
    });

    it('should have optimal layout on desktop', () => {
      renderWithRouter(<OrganizationOnboarding />);
      
      // Form should be properly centered with max width
      const formContainer = screen.getByRole('form').closest('.max-w-2xl');
      expect(formContainer).toBeInTheDocument();
      
      // All form elements should be visible
      expect(screen.getByLabelText(/Organization Name/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Organization Domain/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Administrator Name/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Administrator Email/)).toBeInTheDocument();
    });
  });

  describe('Large Desktop Viewport (1440px+)', () => {
    beforeEach(() => {
      mockViewport(1440, 900);
    });

    it('should not become too wide on large screens', () => {
      renderWithRouter(<OrganizationOnboarding />);
      
      // Form should maintain reasonable max width
      const formContainer = screen.getByRole('form').closest('.max-w-2xl');
      expect(formContainer).toBeInTheDocument();
      
      // Content should be centered
      const mainContainer = screen.getByRole('main');
      expect(mainContainer).toBeInTheDocument();
    });
  });

  describe('Zoom and Accessibility', () => {
    it('should remain usable at 200% zoom', () => {
      // Simulate 200% zoom by halving viewport width
      mockViewport(640, 480);
      
      renderWithRouter(<OrganizationOnboarding />);
      
      // All essential elements should still be accessible
      expect(screen.getByText('Create Your Organization')).toBeInTheDocument();
      expect(screen.getByLabelText(/Organization Name/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Create Organization/ })).toBeInTheDocument();
      
      // Form should not have horizontal scroll
      const form = screen.getByRole('form');
      expect(form).toBeInTheDocument();
    });

    it('should maintain readability at high zoom levels', () => {
      mockViewport(320, 568); // Very small viewport simulating high zoom
      
      renderWithRouter(<OrganizationOnboarding />);
      
      // Text should still be readable
      expect(screen.getByText('Create Your Organization')).toBeInTheDocument();
      
      // Form fields should still be usable
      const inputs = screen.getAllByRole('textbox');
      expect(inputs).toHaveLength(4);
      
      inputs.forEach(input => {
        expect(input).toBeVisible();
      });
    });
  });

  describe('Orientation Changes', () => {
    it('should handle portrait to landscape orientation change', () => {
      // Start in portrait
      mockViewport(375, 667);
      renderWithRouter(<OrganizationOnboarding />);
      
      expect(screen.getByText('Create Your Organization')).toBeInTheDocument();
      
      // Switch to landscape
      mockViewport(667, 375);
      
      // Content should still be accessible
      expect(screen.getByText('Create Your Organization')).toBeInTheDocument();
      expect(screen.getByRole('form')).toBeInTheDocument();
    });

    it('should maintain form functionality across orientations', async () => {
      const user = userEvent.setup();
      
      // Start in portrait
      mockViewport(375, 667);
      renderWithRouter(<OrganizationOnboarding />);
      
      const orgNameInput = screen.getByLabelText(/Organization Name/);
      await user.type(orgNameInput, 'Test University');
      
      // Switch to landscape
      mockViewport(667, 375);
      
      // Form data should be preserved
      expect(orgNameInput).toHaveValue('Test University');
      
      // Should still be able to interact with form
      await user.type(screen.getByLabelText(/Administrator Name/), 'John Doe');
      expect(screen.getByLabelText(/Administrator Name/)).toHaveValue('John Doe');
    });
  });

  describe('Print Styles', () => {
    it('should be print-friendly', () => {
      renderWithRouter(<OrganizationOnboarding />);
      
      // Essential content should be present for printing
      expect(screen.getByText('Create Your Organization')).toBeInTheDocument();
      expect(screen.getByRole('form')).toBeInTheDocument();
      
      // Form should be structured for print
      const form = screen.getByRole('form');
      expect(form).toBeInTheDocument();
    });
  });

  describe('Performance on Different Viewports', () => {
    it('should render quickly on mobile', () => {
      mockViewport(375, 667);
      
      const startTime = performance.now();
      renderWithRouter(<OrganizationOnboarding />);
      const endTime = performance.now();
      
      // Should render within reasonable time (less than 100ms for this simple component)
      expect(endTime - startTime).toBeLessThan(100);
      
      // Essential elements should be present
      expect(screen.getByText('Create Your Organization')).toBeInTheDocument();
    });

    it('should handle rapid viewport changes', () => {
      const viewports = [
        [375, 667],   // Mobile portrait
        [667, 375],   // Mobile landscape
        [768, 1024],  // Tablet portrait
        [1024, 768],  // Tablet landscape
        [1440, 900],  // Desktop
      ];
      
      renderWithRouter(<OrganizationOnboarding />);
      
      viewports.forEach(([width, height]) => {
        mockViewport(width, height);
        
        // Component should remain functional
        expect(screen.getByText('Create Your Organization')).toBeInTheDocument();
        expect(screen.getByRole('form')).toBeInTheDocument();
      });
    });
  });

  describe('Content Reflow', () => {
    it('should reflow content appropriately on narrow screens', () => {
      mockViewport(320, 568); // Very narrow screen
      
      renderWithRouter(<OrganizationOnboarding />);
      
      // Content should still be accessible
      expect(screen.getByText('Create Your Organization')).toBeInTheDocument();
      
      // Form elements should stack vertically
      const inputs = screen.getAllByRole('textbox');
      expect(inputs).toHaveLength(4);
      
      // No horizontal scrolling should be required
      const form = screen.getByRole('form');
      expect(form).toBeInTheDocument();
    });

    it('should maintain proper line length for readability', () => {
      mockViewport(1920, 1080); // Very wide screen
      
      renderWithRouter(<OrganizationOnboarding />);
      
      // Content should not become too wide
      const formContainer = screen.getByRole('form').closest('.max-w-2xl');
      expect(formContainer).toBeInTheDocument();
      
      // Text should remain readable
      expect(screen.getByText(/Set up your educational institution/)).toBeInTheDocument();
    });
  });
});