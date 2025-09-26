import { render, screen } from '@testing-library/react';
import { Button, buttonVariants } from '@/shared/ui/button';

describe('Button', () => {
  it('renders with default styles and content', () => {
    render(<Button>Click me</Button>);

    const button = screen.getByRole('button', { name: 'Click me' });
    const expectedClasses = buttonVariants({ variant: 'default', size: 'default' });

    expectedClasses.split(' ').forEach((className) => {
      expect(button).toHaveClass(className);
    });
  });

  it('applies variant, size, and custom classes', () => {
    render(
      <Button variant="destructive" size="sm" className="shadow-lg">
        Remove
      </Button>,
    );

    const button = screen.getByRole('button', { name: 'Remove' });
    const expectedClasses = buttonVariants({ variant: 'destructive', size: 'sm' });

    expectedClasses
      .split(' ')
      .filter((className) => !className.startsWith('shadow'))
      .forEach((className) => {
        expect(button).toHaveClass(className);
      });
    expect(button).toHaveClass('shadow-lg');
  });

  it('renders children through Slot when asChild is true', () => {
    render(
      <Button asChild>
        <a href="#details">Details</a>
      </Button>,
    );

    const link = screen.getByRole('link', { name: 'Details' });

    expect(link).toHaveAttribute('href', '#details');
    expect(link.tagName).toBe('A');
  });
});
