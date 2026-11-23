import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import DocumentStatus from '../../components/DocumentStatus.jsx';

describe('DocumentStatus', () => {
  it('announces processing and ready states', () => {
    const { rerender } = render(<DocumentStatus status="processing" />);
    expect(screen.getByRole('status')).toHaveTextContent(/processing/i);

    rerender(<DocumentStatus status="ready" />);
    expect(screen.getByRole('status')).toHaveTextContent(/ready to use/i);
  });

  it('reports a processing failure as an alert', () => {
    render(
      <DocumentStatus
        status="failed"
        error={{ code: 'PDF_NO_TEXT', message: 'No selectable text was found.' }}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(/no selectable text/i);
  });
});
